/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * LocalLeaderboard test stubs (src/leaderboard/LocalLeaderboard.ts)
 *
 * Note: `localStorage` is provided by jsdom (vitest environment: 'jsdom').
 * Tests reset localStorage between runs via beforeEach.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalLeaderboard } from '../../src/leaderboard/LocalLeaderboard';
import type { LeaderboardEntry } from '../../src/leaderboard/interfaces';

const makeEntry = (score: number, name = 'Player'): LeaderboardEntry => ({
    playerName: name,
    score,
    distance: score * 10,
    achievedAt: new Date().toISOString(),
    characterType: 'default',
});

describe('LocalLeaderboard', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts with zero entries', () => {
        const lb = new LocalLeaderboard();
        expect(lb.count).toBe(0);
    });

    it('addEntry increments count', () => {
        const lb = new LocalLeaderboard();
        lb.addEntry(makeEntry(100));
        expect(lb.count).toBe(1);
    });

    it('getTopN returns entries sorted by score descending', () => {
        const lb = new LocalLeaderboard();
        lb.addEntry(makeEntry(50));
        lb.addEntry(makeEntry(200));
        lb.addEntry(makeEntry(100));
        const top = lb.getTopN(3);
        expect(top[0]!.score).toBe(200);
        expect(top[1]!.score).toBe(100);
        expect(top[2]!.score).toBe(50);
    });

    it('getTopN limits the result to n', () => {
        const lb = new LocalLeaderboard();
        for (let i = 0; i < 10; i++) lb.addEntry(makeEntry(i * 10));
        expect(lb.getTopN(3)).toHaveLength(3);
    });

    it('enforces maxEntries cap', () => {
        const lb = new LocalLeaderboard(5);
        for (let i = 0; i < 10; i++) lb.addEntry(makeEntry(i * 10));
        expect(lb.count).toBe(5);
    });

    it('clear resets count to zero', () => {
        const lb = new LocalLeaderboard();
        lb.addEntry(makeEntry(999));
        lb.clear();
        expect(lb.count).toBe(0);
    });

    it('persists and reloads entries from localStorage', () => {
        const lb1 = new LocalLeaderboard();
        lb1.addEntry(makeEntry(777, 'Hero'));

        const lb2 = new LocalLeaderboard(); // loads from localStorage
        expect(lb2.count).toBe(1);
        expect(lb2.getTopN(1)[0]!.playerName).toBe('Hero');
    });
});
