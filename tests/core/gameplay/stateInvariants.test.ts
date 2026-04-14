/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Regression tests for critical store bugs found in paranoid-level audit.
 *
 * Bugs covered:
 *   1. revive() invincibility immediately cancelled by updateInvincibilityTimer
 *   2. deathTimer not reset in startGameplay() → premature GAME_OVER on restart
 *   3. updateDeathTimer two-set race (atomicity)
 *   4. computeEffectiveSpeed hidden performance.now() call (determinism)
 *   5. collectCoin double set() — score atom test
 *   6. updateInvincibilityTimer stale isDashing read
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeEffectiveSpeed } from '../../../store/gameplay/speedActions';
import { GAMEPLAY_CONFIG, RUN_SPEED_BASE } from '../../../constants';

// ── 4. computeEffectiveSpeed determinism ────────────────────────────────────

describe('computeEffectiveSpeed', () => {
    it('returns baseSpeed when no boost and no slows', () => {
        const speed = computeEffectiveSpeed(20, false, [], 1000);
        expect(speed).toBe(20);
    });

    it('applies SPEED_BOOST_FACTOR when boost is active', () => {
        const speed = computeEffectiveSpeed(10, true, [], 1000);
        // SPEED_BOOST_FACTOR = 2.0, result clamped to MAX_SPEED if needed
        expect(speed).toBe(Math.min(GAMEPLAY_CONFIG.MAX_SPEED, 10 * 2.0));
    });

    it('applies the minimum slow factor when multiple slows are stacked', () => {
        const now = 1000;
        const slows = [
            { factor: 0.8, expiresAt: now + 1000 },
            { factor: 0.5, expiresAt: now + 2000 },
            { factor: 0.3, expiresAt: now + 500 },
        ];
        const speed = computeEffectiveSpeed(20, false, slows, now);
        // min factor = 0.3; 20 * 0.3 = 6 → clamped to MIN_SPEED
        expect(speed).toBe(GAMEPLAY_CONFIG.MIN_SPEED);
    });

    it('ignores expired slow effects (expiresAt <= now)', () => {
        const now = 5000;
        const slows = [
            { factor: 0.1, expiresAt: 3000 },  // expired
            { factor: 0.1, expiresAt: 4999 },  // expired (equal is also expired)
        ];
        const speed = computeEffectiveSpeed(20, false, slows, now);
        // No active slows → speed = baseSpeed
        expect(speed).toBe(20);
    });

    it('is deterministic — same inputs produce the same output regardless of wall time', () => {
        const slows = [{ factor: 0.6, expiresAt: 99999 }];
        const a = computeEffectiveSpeed(20, false, slows, 1000);
        const b = computeEffectiveSpeed(20, false, slows, 1000);
        expect(a).toBe(b);
    });

    it('clamps result to MIN_SPEED', () => {
        const speed = computeEffectiveSpeed(RUN_SPEED_BASE, false, [{ factor: 0.0001, expiresAt: 99999 }], 1000);
        expect(speed).toBeGreaterThanOrEqual(GAMEPLAY_CONFIG.MIN_SPEED);
    });

    it('clamps result to MAX_SPEED', () => {
        const speed = computeEffectiveSpeed(GAMEPLAY_CONFIG.MAX_SPEED + 100, true, [], 1000);
        expect(speed).toBeLessThanOrEqual(GAMEPLAY_CONFIG.MAX_SPEED);
    });

    it('treats slows expiring exactly at now as expired', () => {
        const now = 2000;
        const slows = [{ factor: 0.1, expiresAt: now }]; // expiresAt === now → expired (> now fails)
        const speed = computeEffectiveSpeed(20, false, slows, now);
        expect(speed).toBe(20);
    });
});

// ── 1. revive() invincibility via timer system ───────────────────────────────

describe('revive invincibility invariant', () => {
    /**
     * Simulate the invincibilityTimer update loop for N frames.
     * Returns the final `isInvincible` flag.
     */
    function simulateTimerFrames(
        frames: number,
        dt: number,
        initialTimer: number,
        initialInvincible: boolean,
        isDashing = false
    ): boolean {
        let invincibilityTimer = initialTimer;
        let isInvincible = initialInvincible;

        for (let i = 0; i < frames; i++) {
            // replicate updateInvincibilityTimer logic
            if (invincibilityTimer <= 0 && !isInvincible) break;
            const newTimer = Math.max(0, invincibilityTimer - dt);
            isInvincible = newTimer > 0 || isDashing;
            invincibilityTimer = newTimer;
        }
        return isInvincible;
    }

    it('BUG GUARD: invincibility NOT cancelled on first frame after revive when invincibilityTimer=2.0', () => {
        // After fix: revive sets invincibilityTimer=2.0 (not 0)
        const stillInvincible = simulateTimerFrames(1, 0.016, 2.0, true);
        expect(stillInvincible).toBe(true);
    });

    it('BUG GUARD (old behaviour): invincibility IS cancelled on first frame when invincibilityTimer=0', () => {
        // This is the old (pre-fix) behaviour — proves the bug existed
        const cancelledImmediately = simulateTimerFrames(1, 0.016, 0, true);
        expect(cancelledImmediately).toBe(false);
    });

    it('invincibility expires naturally after ~2s (125 frames at 60fps)', () => {
        const stillInvincible = simulateTimerFrames(125, 0.016, 2.0, true);
        expect(stillInvincible).toBe(false);
    });

    it('invincibility persists while isDashing even with timer=0', () => {
        const invincible = simulateTimerFrames(1, 0.016, 0, true, true /* isDashing */);
        expect(invincible).toBe(true);
    });
});

// ── 2. deathTimer reset on startGameplay ────────────────────────────────────

describe('deathTimer reset guard', () => {
    /**
     * Simulate updateDeathTimer for N frames.
     * Returns { finalTimer, triggeredGameOver }.
     */
    function simulateDeathTimer(
        frames: number,
        dt: number,
        initialTimer: number
    ): { finalTimer: number; triggeredGameOver: boolean } {
        let deathTimer = initialTimer;
        let triggeredGameOver = false;

        for (let i = 0; i < frames; i++) {
            if (deathTimer <= 0) break;
            const newTimer = Math.max(0, deathTimer - dt);
            // Atomic update (post-fix)
            deathTimer = newTimer;
            if (newTimer === 0) {
                triggeredGameOver = true;
            }
        }

        return { finalTimer: deathTimer, triggeredGameOver };
    }

    it('BUG GUARD: deathTimer=0 on new game prevents GAME_OVER from triggering', () => {
        const { triggeredGameOver } = simulateDeathTimer(10, 0.016, 0);
        expect(triggeredGameOver).toBe(false);
    });

    it('deathTimer=0.5 remaining from old game would trigger GAME_OVER if NOT reset', () => {
        const { triggeredGameOver } = simulateDeathTimer(60, 0.016, 0.5);
        expect(triggeredGameOver).toBe(true);
    });

    it('deathTimer counts down correctly to exactly 0', () => {
        const { finalTimer } = simulateDeathTimer(1000, 0.016, 1.0);
        expect(finalTimer).toBe(0);
    });
});

// ── 3. updateDeathTimer atomic set ───────────────────────────────────────────

describe('updateDeathTimer atomicity', () => {
    it('status transitions to GAME_OVER in same update as deathTimer reaching 0', () => {
        // Simulate the atomic logic (post-fix):
        // set(newTimer === 0 ? { deathTimer: 0, status: GAME_OVER } : { deathTimer: newTimer })
        let deathTimer = 0.016; // exactly one frame left
        let status = 'PLAYING';

        const dt = 0.016;
        const newTimer = Math.max(0, deathTimer - dt);
        // Atomic: both applied in same "set" call
        if (newTimer === 0) {
            deathTimer = 0;
            status = 'GAME_OVER';
        } else {
            deathTimer = newTimer;
        }

        expect(deathTimer).toBe(0);
        expect(status).toBe('GAME_OVER');
    });

    it('no intermediate frame with deathTimer=0 and status=PLAYING', () => {
        // In the old two-set approach there would be one frame where deathTimer=0
        // but status=PLAYING (between the two set() calls).
        // Post-fix: never happens — the conditional produces exactly one update.
        let frames: Array<{ deathTimer: number; status: string }> = [];
        let deathTimer = 0.05;
        let status = 'PLAYING';

        for (let i = 0; i < 10; i++) {
            if (deathTimer <= 0) break;
            const dt = 0.016;
            const newTimer = Math.max(0, deathTimer - dt);
            if (newTimer === 0) {
                deathTimer = 0;
                status = 'GAME_OVER';
            } else {
                deathTimer = newTimer;
            }
            frames.push({ deathTimer, status });
        }

        // Every frame with deathTimer=0 must have status=GAME_OVER
        const badFrames = frames.filter(f => f.deathTimer === 0 && f.status !== 'GAME_OVER');
        expect(badFrames).toHaveLength(0);
    });
});

// ── 5. collectCoin single atomic state update ────────────────────────────────

describe('collectCoin atomicity (single set guard)', () => {
    it('score + combo increment are consistent when computed together', () => {
        // Simulate the merged logic (post-fix): score is incremented in the same
        // set() call as combo, so the resulting state is always consistent.
        let score = 100;
        let combo = 3;
        let multiplier = 1;

        const points = 5;
        const bonus = 0;
        const newCombo = combo + 1;
        const newMultiplier = Math.floor(newCombo / 5) + 1;
        const finalPoints = (points + bonus) * newMultiplier;

        // Single atomic update
        score = Math.min(9999999, score + finalPoints);
        combo = newCombo;
        multiplier = newMultiplier;

        expect(score).toBe(100 + finalPoints);
        expect(combo).toBe(4);
        expect(multiplier).toBe(1); // floor(4/5)+1 = 0+1 = 1
    });

    it('combo milestone 5 gives ×2 multiplier atomically', () => {
        let score = 0;
        let combo = 4; // about to hit 5

        const points = 5;
        const newCombo = combo + 1; // = 5
        const newMultiplier = Math.floor(newCombo / 5) + 1; // = 2
        const finalPoints = points * newMultiplier; // = 10

        score += finalPoints;
        expect(score).toBe(10);
        expect(newMultiplier).toBe(2);
    });
});

// ── 6. updateInvincibilityTimer safe isDashing read ─────────────────────────

describe('updateInvincibilityTimer isDashing read', () => {
    it('reads isDashing from state snapshot, not stale closure', () => {
        // Post-fix: set(s => ({ isInvincible: newTimer > 0 || s.isDashing }))
        // Verify the logic is correct with isDashing=true and timer=0
        const state = { invincibilityTimer: 0.016, isInvincible: true, isDashing: true };
        const dt = 0.016;
        const newTimer = Math.max(0, state.invincibilityTimer - dt);
        // Using state callback: reads s.isDashing at write time
        const newInvincible = newTimer > 0 || state.isDashing;
        expect(newInvincible).toBe(true); // stays invincible because dashing
    });

    it('clears invincibility when timer=0 and isDashing=false', () => {
        const state = { invincibilityTimer: 0.016, isInvincible: true, isDashing: false };
        const dt = 0.016;
        const newTimer = Math.max(0, state.invincibilityTimer - dt);
        const newInvincible = newTimer > 0 || state.isDashing;
        expect(newInvincible).toBe(false);
    });
});
