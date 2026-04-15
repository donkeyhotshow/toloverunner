/**
 * useCombatSystem - Combat Mechanics v2.4.0
 * Handles attack states, enemy destruction, and combat scoring
 */

import { useCallback, useRef } from 'react';
import { useStore } from '../../../store';
import { eventBus } from '../../../utils/eventBus';
import type { GameObject, CombatAttack } from '../../../types';

// Attack configurations
export const ATTACK_CONFIGS: Record<'up' | 'down', CombatAttack> = {
    up: {
        type: 'up' as const,
        hitbox: { width: 3, height: 4, depth: 2, offsetX: 0, offsetY: 2, offsetZ: 0 },
        duration: 300,
        damage: 1
    },
    down: {
        type: 'down' as const,
        hitbox: { width: 4, height: 1.5, depth: 3, offsetX: 0, offsetY: 0.5, offsetZ: 1 },
        duration: 400,
        damage: 1
    }
};

// Enemy types that can be destroyed (using string for flexibility).
// GDD: Viruses (VIRUS_KILLER_LOW, VIRUS_KILLER_HIGH, etc.) cause instant death and bypass
// MEMBRANE_SHIELD — they must NOT be in this list. Attempting to "destroy" a lethal virus
// with a combat attack would cause confusing double-punishment (resetCombo + instant death).
const DESTRUCTIBLE_TYPES: string[] = [
    'GLOBUS_NORMAL',
    'GLOBUS_ANGRY',
    'BACTERIA_LOW',
    'BACTERIA_MID',
    'BACTERIA_WALL',
    'BACTERIA_HAPPY',
    'COMBAT'
];

// Enemies requiring UP attack (flying/low)
const UP_ATTACK_EFFECTIVE: string[] = ['GLOBUS_NORMAL', 'GLOBUS_ANGRY'];
// Enemies requiring DOWN attack (ground)
const DOWN_ATTACK_EFFECTIVE: string[] = ['BACTERIA_LOW', 'BACTERIA_MID', 'BACTERIA_WALL', 'BACTERIA_HAPPY'];

export const useCombatSystem = () => {
    const combatScoreRef = useRef<number>(0);
    const { setAttack, incrementCombo, resetCombo, activateSpeedBoost, setLocalPlayerState } = useStore();

    // Trigger attack - called from swipe input
    const triggerAttack = useCallback((direction: 'up' | 'down') => {
        const config = ATTACK_CONFIGS[direction];
        if (!config) return;

        // Update store with specialized action (attackTimer set inside setAttack)
        setAttack(direction);
    }, [setAttack]);

    // Check if player is currently attacking.
    // Uses attackTimer from the store (deterministic, fixed-dt) instead of performance.now()
    // so attack windows are consistent in replays and multiplayer.
    const isAttacking = useCallback((): boolean => {
        return useStore.getState().attackTimer > 0;
    }, []);

    // Get current attack type
    const getCurrentAttack = useCallback((): 'none' | 'up' | 'down' => {
        if (!isAttacking()) return 'none';
        return useStore.getState().attackState;
    }, [isAttacking]);

    // Check collision between attack hitbox and enemy
    const checkAttackHit = useCallback((
        playerPos: [number, number, number],
        enemy: GameObject,
        zOverride?: number
    ): boolean => {
        if (!isAttacking()) return false;

        const attack = useStore.getState().attackState;
        const config = ATTACK_CONFIGS[attack === 'up' ? 'up' : 'down'];
        if (!config) return false;

        const { hitbox } = config;
        const [playerX, playerY, playerZ] = playerPos;

        const attackX = playerX + hitbox.offsetX;
        const attackY = playerY + hitbox.offsetY;
        const attackZ = playerZ + hitbox.offsetZ;

        const [enemyX, enemyY, enemyZOrig] = enemy.position;
        const enemyZ = zOverride !== undefined ? zOverride : enemyZOrig;

        const overlapX = Math.abs(attackX - enemyX) < (hitbox.width / 2 + 1.2);
        const overlapY = Math.abs(attackY - enemyY) < (hitbox.height / 2 + 1.2);
        const overlapZ = Math.abs(attackZ - enemyZ) < (hitbox.depth / 2 + 1.5);

        return overlapX && overlapY && overlapZ;
    }, [isAttacking]);

    // Check if attack is effective against enemy type
    const isAttackEffective = useCallback((enemyType: string): boolean => {
        const attack = useStore.getState().attackState;
        const isJumping = useStore.getState().localPlayerState.isJumping;

        // ⚔️ GDD v2.4.0: Jump Attack (UP + DOWN)
        if (enemyType === 'COMBAT') {
            return attack === 'down' && isJumping;
        }

        if (attack === 'up') {
            return UP_ATTACK_EFFECTIVE.includes(enemyType);
        } else if (attack === 'down') {
            return DOWN_ATTACK_EFFECTIVE.includes(enemyType);
        }

        return false;
    }, []);

    // Destroy enemy and award points
    const destroyEnemy = useCallback((enemy: GameObject): boolean => {
        const enemyType = enemy.type;

        if (!DESTRUCTIBLE_TYPES.includes(enemyType)) {
            return false;
        }

        if (!isAttackEffective(enemyType)) {
            eventBus.emit('combat:damage', { damage: 1 });
            resetCombo(); // Reset combo on improper attack
            return false;
        }

        enemy.active = false;

        // Success!
        incrementCombo();

        const points = enemyType.includes('BOSS') ? 500 :
            enemyType.includes('ANGRY') ? 50 : 25;

        // Get fresh multiplier value each time to avoid stale closure
        const store = useStore.getState();
        const currentMultiplier = store.multiplier;
        const finalPoints = Math.round(points * currentMultiplier);
        combatScoreRef.current += finalPoints;

        // Update combat score using fresh state reference
        const currentState = store.localPlayerState;
        setLocalPlayerState({
            ...currentState,
            combatScore: combatScoreRef.current
        });

        if (enemyType.includes('BOSS')) {
            eventBus.emit('combat:boss_hit', { bossId: enemyType, damage: points });
        }

        // Speed boost for successful kill
        activateSpeedBoost();
        return true;
    }, [isAttackEffective, incrementCombo, resetCombo, activateSpeedBoost, setLocalPlayerState]);

    const resetCombat = useCallback(() => {
        combatScoreRef.current = 0;
    }, []);

    return {
        triggerAttack,
        isAttacking,
        getCurrentAttack,
        checkAttackHit,
        destroyEnemy,
        resetCombat,
        combatScore: (): number => combatScoreRef.current
    };
};

export default useCombatSystem;
