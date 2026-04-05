/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GlobusBossPhases - Full phase system for GLOBUS_BOSS
 * Includes Chase, Attack, and QTE phases with interactive events
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import { Vector3, Mesh, Group } from 'three';
import { useStore } from '../../../store';
import { eventBus } from '../../../utils/eventBus';

// ==================== TYPES ====================

export type BossPhase = 'idle' | 'chase' | 'attack' | 'qte' | 'hurt' | 'defeated';
export type AttackPattern = 'slap' | 'spit' | 'sweep' | 'charge' | 'combo' | 'special';
export type QTEType = 'dodge' | 'jump' | 'attack' | 'defend';

export interface BossConfig {
    maxHp: number;
    position: [number, number, number];
    chaseSpeed: number;
    attackDamage: number;
    qteTimeLimit: number; // seconds
    qteSuccessReward: number; // damage to boss
}

export interface ChaseState {
    targetPosition: Vector3;
    approachDistance: number;
    retreatDistance: number;
    strafeDirection: number; // -1, 0, 1
    isStrafing: boolean;
}

export interface AttackState {
    currentPattern: AttackPattern;
    windupTime: number;
    activeTime: number;
    recoveryTime: number;
    patternProgress: number; // 0-1
    projectiles: Projectile[];
}

export interface QTEState {
    currentQTE: QTEType | null;
    timeRemaining: number;
    playerInput: QTEType | null;
    isActive: boolean;
    successCount: number;
    requiredCount: number;
    difficulty: number;
}

export interface Projectile {
    id: string;
    position: Vector3;
    velocity: Vector3;
    type: 'slime' | 'spike' | 'energy';
    damage: number;
    scale: number;
}

// ==================== CONSTANTS ====================

const DEFAULT_BOSS_CONFIG: BossConfig = {
    maxHp: 500,
    position: [0, 3, -30],
    chaseSpeed: 8,
    attackDamage: 1,
    qteTimeLimit: 5,
    qteSuccessReward: 50,
};

const PHASE_DURATIONS = {
    idle: { min: 2, max: 4 },
    chase: { min: 3, max: 6 },
    attack: { min: 2, max: 4 },
    qte: { min: 5, max: 10 },
    hurt: { min: 0.5, max: 1 },
};

const ATTACK_PATTERNS: AttackPattern[] = ['slap', 'spit', 'sweep', 'charge', 'combo', 'special'];

const QTE_SEQUENCE: QTEType[] = ['dodge', 'jump', 'attack', 'dodge', 'jump'];

// ==================== COMPONENT ====================

export const GlobusBossPhases: React.FC<{
    config?: Partial<BossConfig>;
    onDefeat?: () => void;
    onPhaseChange?: (phase: BossPhase) => void;
}> = ({
    config = {},
    onDefeat,
    onPhaseChange,
}) => {
        // Merge config with defaults
        const bossConfig = useMemo(() => ({
            ...DEFAULT_BOSS_CONFIG,
            ...config,
        }), [config]);

        // State
        const [currentPhase, setCurrentPhase] = useState<BossPhase>('idle');
        const [currentHp, setCurrentHp] = useState(bossConfig.maxHp);
        const [isDefeated, setIsDefeated] = useState(false);

        // Chase state
        const [chaseState, setChaseState] = useState<ChaseState>({
            targetPosition: new Vector3(...bossConfig.position),
            approachDistance: 15,
            retreatDistance: 25,
            strafeDirection: 0,
            isStrafing: false,
        });

        // Attack state
        const [attackState, setAttackState] = useState<AttackState>({
            currentPattern: 'slap',
            windupTime: 0.5,
            activeTime: 1.0,
            recoveryTime: 0.5,
            patternProgress: 0,
            projectiles: [],
        });

        // QTE state
        const [qteState, setQteState] = useState<QTEState>({
            currentQTE: null,
            timeRemaining: 5,
            playerInput: null,
            isActive: false,
            successCount: 0,
            requiredCount: 3,
            difficulty: 1,
        });

        // Refs
        const groupRef = useRef<Group>(null);
        const bodyRef = useRef<Mesh>(null);
        const eyeLeftRef = useRef<Mesh>(null);
        const eyeRightRef = useRef<Mesh>(null);
        const tailRef = useRef<Mesh>(null);

        // Animation refs
        const phaseTimerRef = useRef(0);
        const attackTimerRef = useRef(0);
        const qteTimerRef = useRef(0);
        const tailAngleRef = useRef(0);

        // Get player position from store
        const playerPosition = useStore(s => s.localPlayerState?.position) || [0, 0, 0];

        // Track player for chase behavior
        const playerPosRef = useRef(new Vector3(...playerPosition));
        playerPosRef.current.set(playerPosition[0], playerPosition[1], playerPosition[2]);

        // Colors based on state
        const bodyColor = useMemo(() => {
            switch (currentPhase) {
                case 'hurt': return '#FF4444';
                case 'defeated': return '#444444';
                case 'chase': return '#FF6666';
                case 'attack': return '#FF0000';
                case 'qte': return '#FF8800';
                default: return '#B22222';
            }
        }, [currentPhase]);

        // Phase management
        const transitionToPhase = useCallback((newPhase: BossPhase) => {
            setCurrentPhase(newPhase);
            phaseTimerRef.current = 0;

            // Trigger phase change event
            eventBus.emit('boss:phase_change', { phase: newPhase });
            onPhaseChange?.(newPhase);

            // Initialize phase-specific state
            if (newPhase === 'chase') {
                initChasePhase();
            } else if (newPhase === 'attack') {
                initAttackPhase();
            } else if (newPhase === 'qte') {
                initQTEPhase();
            }
        }, [onPhaseChange]);

        // Initialize Chase phase
        const initChasePhase = useCallback(() => {
            const direction = Math.random() > 0.5 ? 1 : -1;
            setChaseState(prev => ({
                ...prev,
                targetPosition: playerPosRef.current.clone(),
                strafeDirection: direction,
                isStrafing: true,
            }));
        }, []);

        // Initialize Attack phase
        const initAttackPhase = useCallback(() => {
            const idx = Math.floor(Math.random() * ATTACK_PATTERNS.length);
            const pattern = ATTACK_PATTERNS[idx] ?? ATTACK_PATTERNS[0];
            setAttackState({
                currentPattern: pattern!,
                windupTime: getWindupTime(pattern!),
                activeTime: getActiveTime(pattern!),
                recoveryTime: getRecoveryTime(pattern!),
                patternProgress: 0,
                projectiles: [],
            });
            attackTimerRef.current = 0;
        }, []);

        // Initialize QTE phase
        const initQTEPhase = useCallback(() => {
            const qteIndex = Math.floor(Math.random() * QTE_SEQUENCE.length);
            const qte = QTE_SEQUENCE[qteIndex] || null;
            setQteState({
                currentQTE: qte,
                timeRemaining: bossConfig.qteTimeLimit,
                playerInput: null,
                isActive: true,
                successCount: 0,
                requiredCount: 3,
                difficulty: 1 + Math.floor(currentHp / (bossConfig.maxHp * 0.3)),
            });
            qteTimerRef.current = 0;
        }, [bossConfig.qteTimeLimit, currentHp, bossConfig.maxHp]);

        // Get timing for attack patterns
        const getWindupTime = (pattern: AttackPattern) => {
            switch (pattern) {
                case 'slap': return 0.5;
                case 'spit': return 0.8;
                case 'sweep': return 0.6;
                case 'charge': return 1.0;
                case 'combo': return 0.3;
                case 'special': return 1.5;
                default: return 0.5;
            }
        };

        const getActiveTime = (pattern: AttackPattern) => {
            switch (pattern) {
                case 'slap': return 0.5;
                case 'spit': return 2.0;
                case 'sweep': return 1.0;
                case 'charge': return 2.0;
                case 'combo': return 3.0;
                case 'special': return 3.0;
                default: return 1.0;
            }
        };

        const getRecoveryTime = (pattern: AttackPattern) => {
            switch (pattern) {
                case 'slap': return 0.3;
                case 'spit': return 0.5;
                case 'sweep': return 0.8;
                case 'charge': return 1.0;
                case 'combo': return 1.5;
                case 'special': return 2.0;
                default: return 0.5;
            }
        };

        // Take damage
        const takeDamage = useCallback((damage: number) => {
            if (isDefeated || currentPhase === 'defeated') return;

            const newHp = Math.max(0, currentHp - damage);
            setCurrentHp(newHp);

            // Emit hit event
            eventBus.emit('boss:hit', { bossId: 'globus', damage, newHp });

            // Flash hurt state
            if (currentPhase !== 'hurt') {
                transitionToPhase('hurt');
            }

            // Check for defeat
            if (newHp <= 0) {
                setIsDefeated(true);
                transitionToPhase('defeated');
                onDefeat?.();
                eventBus.emit('boss:defeated', undefined);
            }
        }, [currentHp, currentPhase, isDefeated, transitionToPhase, onDefeat]);

        // Handle player input for QTE
        useEffect(() => {
            const handleInput = (input: { action: string }) => {
                if (currentPhase !== 'qte' || !qteState.isActive) return;

                const actionMap: Record<string, QTEType> = {
                    'left': 'dodge',
                    'right': 'dodge',
                    'jump': 'jump',
                    'attack': 'attack',
                    'up': 'attack',
                    'down': 'defend',
                };

                const playerAction = actionMap[input.action] as QTEType;
                if (playerAction && playerAction === qteState.currentQTE) {
                    // Success!
                    setQteState(prev => ({
                        ...prev,
                        successCount: prev.successCount + 1,
                        playerInput: playerAction,
                    }));

                    eventBus.emit('boss:qte_success', { type: playerAction });

                    // Check if QTE sequence complete
                    if (qteState.successCount + 1 >= qteState.requiredCount) {
                        // QTE success - boss takes damage
                        takeDamage(bossConfig.qteSuccessReward);
                        transitionToPhase('idle');
                    }
                } else {
                    // Wrong input
                    eventBus.emit('boss:qte_fail', { type: playerAction });
                }
            };

            eventBus.on('input:action', handleInput);
            return () => eventBus.off('input:action', handleInput);
        }, [currentPhase, qteState, bossConfig.qteSuccessReward, takeDamage, transitionToPhase]);

        // Main update loop
        useFrame((_state, delta) => {
            if (isDefeated) return;

            phaseTimerRef.current += delta;
            attackTimerRef.current += delta;
            qteTimerRef.current += delta;

            // Update tail animation
            if (tailRef.current) {
                tailAngleRef.current += delta * 3;
                tailRef.current.rotation.z = Math.sin(tailAngleRef.current) * 0.3;

                // More intense during attack
                if (currentPhase === 'attack') {
                    tailRef.current.rotation.z = Math.sin(tailAngleRef.current * 2) * 0.6;
                }
            }

            // Phase-specific updates
            switch (currentPhase) {
                case 'idle':
                    updateIdlePhase(delta);
                    break;
                case 'chase':
                    updateChasePhase(delta);
                    break;
                case 'attack':
                    updateAttackPhase(delta);
                    break;
                case 'qte':
                    updateQTEPhase(delta);
                    break;
                case 'hurt':
                    if (phaseTimerRef.current > PHASE_DURATIONS.hurt.max) {
                        transitionToPhase('idle');
                    }
                    break;
            }

            // Update eye movement
            if (eyeLeftRef.current && eyeRightRef.current) {
                const lookTarget = playerPosRef.current;
                const eyeOffset = 0.05;
                eyeLeftRef.current.lookAt(lookTarget.x + eyeOffset, lookTarget.y, lookTarget.z);
                eyeRightRef.current.lookAt(lookTarget.x - eyeOffset, lookTarget.y, lookTarget.z);
            }
        });

        // Idle phase update
        const updateIdlePhase = (_delta: number) => {
            const { min, max } = PHASE_DURATIONS.idle;

            if (phaseTimerRef.current > min + Math.random() * (max - min)) {
                // Choose next phase based on HP and distance
                const distanceToPlayer = groupRef.current
                    ? groupRef.current.position.distanceTo(playerPosRef.current)
                    : 50;

                if (distanceToPlayer > 20) {
                    transitionToPhase('chase');
                } else if (Math.random() > 0.5) {
                    transitionToPhase('attack');
                } else {
                    transitionToPhase('qte');
                }
            }

            // Idle animation - gentle bobbing
            if (groupRef.current) {
                groupRef.current.position.y = bossConfig.position[1] + Math.sin(phaseTimerRef.current * 2) * 0.2;
            }
        };

        // Chase phase update
        const updateChasePhase = (delta: number) => {
            if (!groupRef.current) return;

            const { min, max } = PHASE_DURATIONS.chase;

            // Move toward player
            const direction = new Vector3()
                .subVectors(playerPosRef.current, groupRef.current.position)
                .normalize();

            // Strafing movement
            const strafeDir = chaseState.strafeDirection;
            direction.x += strafeDir * 0.5;

            // Apply movement
            groupRef.current.position.add(
                direction.multiplyScalar(bossConfig.chaseSpeed * delta)
            );

            // Keep within bounds
            groupRef.current.position.x = Math.max(-10, Math.min(10, groupRef.current.position.x));
            groupRef.current.position.z = Math.max(-50, Math.min(-10, groupRef.current.position.z));

            // Phase duration check
            if (phaseTimerRef.current > min + Math.random() * (max - min)) {
                transitionToPhase('attack');
            }
        };

        // Attack phase update
        const updateAttackPhase = (delta: number) => {
            const { windupTime, activeTime, recoveryTime } = attackState;
            const totalTime = windupTime + activeTime + recoveryTime;

            attackTimerRef.current += delta;
            const progress = Math.min(1, attackTimerRef.current / totalTime);

            // Update pattern progress
            setAttackState(prev => ({
                ...prev,
                patternProgress: progress,
            }));

            // Handle attack animation based on phase
            if (attackTimerRef.current < windupTime) {
                // Windup - telegraphing attack
                if (groupRef.current) {
                    groupRef.current.scale.setScalar(1 + Math.sin(attackTimerRef.current * 10) * 0.1);
                }
            } else if (attackTimerRef.current < windupTime + activeTime) {
                // Active - attack happening
                executeAttack(attackState.currentPattern, delta);
            } else {
                // Recovery - reset
                if (groupRef.current) {
                    groupRef.current.scale.setScalar(1);
                }

                if (attackTimerRef.current > totalTime) {
                    transitionToPhase('idle');
                }
            }
        };

        // Execute specific attack pattern
        const executeAttack = (pattern: AttackPattern, delta: number) => {
            switch (pattern) {
                case 'slap':
                    // Quick horizontal swipe
                    if (groupRef.current) {
                        const swingAngle = Math.sin(attackTimerRef.current * 5) * Math.PI / 3;
                        groupRef.current.rotation.y = swingAngle;
                    }
                    break;
                case 'spit':
                    // Spawn projectile toward player
                    spawnProjectile('slime', bossConfig.attackDamage);
                    break;
                case 'sweep':
                    // Wide horizontal attack
                    if (groupRef.current) {
                        groupRef.current.rotation.y = Math.sin(attackTimerRef.current * 3) * Math.PI;
                    }
                    break;
                case 'charge':
                    // Rush toward player
                    if (groupRef.current) {
                        const dir = new Vector3().subVectors(playerPosRef.current, groupRef.current.position).normalize();
                        groupRef.current.position.add(dir.multiplyScalar(bossConfig.chaseSpeed * 2 * delta));
                    }
                    break;
                case 'combo': {
                    // Multiple quick attacks
                    const comboPhase = Math.floor(attackTimerRef.current / 0.5) % 4;
                    if (comboPhase < 3) {
                        // Quick slaps
                        if (groupRef.current) {
                            groupRef.current.rotation.y = (comboPhase % 2 === 0 ? 1 : -1) * Math.PI / 4;
                        }
                    }
                    break;
                }
                case 'special': {
                    // Ultimate attack - spawn many projectiles; use ref for deterministic seeding
                    const shouldSpawn = (Math.floor(attackTimerRef.current * 1000) % 10) === 0;
                    if (shouldSpawn) {
                        spawnProjectile('energy', bossConfig.attackDamage * 2);
                    }
                    break;
                }
            }
        };

        // Spawn projectile
        const spawnProjectile = (type: 'slime' | 'spike' | 'energy', damage: number) => {
            if (!groupRef.current) return;

            const projectile: Projectile = {
                id: `proj_${Date.now()}_${Math.random()}`,
                position: groupRef.current.position.clone(),
                velocity: new Vector3()
                    .subVectors(playerPosRef.current, groupRef.current.position)
                    .normalize()
                    .multiplyScalar(15),
                type,
                damage,
                scale: type === 'energy' ? 0.5 : 1,
            };

            setAttackState(prev => ({
                ...prev,
                projectiles: [...prev.projectiles, projectile],
            }));

            eventBus.emit('boss:projectile_spawn', { type, damage });
        };

        // QTE phase update
        const updateQTEPhase = (delta: number) => {
            // Update time remaining
            const newTimeRemaining = qteState.timeRemaining - delta;

            if (newTimeRemaining <= 0) {
                // QTE failed - player takes damage
                eventBus.emit('boss:qte_timeout', undefined);
                transitionToPhase('attack');
                return;
            }

            setQteState(prev => ({
                ...prev,
                timeRemaining: newTimeRemaining,
            }));
        };

        // HP percentage
        const hpPercent = (currentHp / bossConfig.maxHp) * 100;

        if (isDefeated || currentPhase === 'defeated') {
            return null;
        }

        return (
            <group ref={groupRef} position={bossConfig.position}>
                {/* HP Bar */}
                <group position={[0, 6, 0]}>
                    {/* Bar background */}
                    <mesh position={[0, 0, 0]}>
                        <planeGeometry args={[12, 1.2]} />
                        <meshBasicMaterial color="#222222" />
                    </mesh>
                    {/* HP fill */}
                    <mesh position={[-(6 - (hpPercent / 100) * 6), 0, 0.01]}>
                        <planeGeometry args={[hpPercent / 100 * 12, 1]} />
                        <meshBasicMaterial color={hpPercent > 30 ? '#44FF44' : '#FF4444'} />
                    </mesh>
                    {/* HP Text */}
                    <Text
                        position={[0, 0, 0.02]}
                        fontSize={0.6}
                        color="#FFFFFF"
                        anchorX="center"
                        anchorY="middle"
                        font="/fonts/inter-bold.woff"
                    >
                        {currentHp} / {bossConfig.maxHp}
                    </Text>
                    {/* Phase indicator */}
                    <Text
                        position={[0, -0.8, 0.02]}
                        fontSize={0.4}
                        color="#FFD700"
                        anchorX="center"
                        anchorY="middle"
                    >
                        {currentPhase.toUpperCase()}
                    </Text>
                </group>

                {/* Boss Body */}
                <mesh ref={bodyRef} position={[0, 2, 0]}>
                    <sphereGeometry args={[2.5, 32, 32]} />
                    <meshToonMaterial color={bodyColor} />
                </mesh>

                {/* Boss Eyes */}
                <mesh ref={eyeLeftRef} position={[-0.8, 2.8, 2.2]}>
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshBasicMaterial color="#FFFFFF" />
                </mesh>
                <mesh ref={eyeRightRef} position={[0.8, 2.8, 2.2]}>
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshBasicMaterial color="#FFFFFF" />
                </mesh>
                {/* Pupils */}
                <mesh position={[-0.8, 2.8, 2.5]}>
                    <sphereGeometry args={[0.25, 16, 16]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
                <mesh position={[0.8, 2.8, 2.5]}>
                    <sphereGeometry args={[0.25, 16, 16]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>

                {/* Angry eyebrows */}
                <mesh position={[-0.8, 3.5, 2]} rotation={[0, 0, -0.3]}>
                    <boxGeometry args={[0.6, 0.15, 0.1]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>
                <mesh position={[0.8, 3.5, 2]} rotation={[0, 0, 0.3]}>
                    <boxGeometry args={[0.6, 0.15, 0.1]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>

                {/* Tail */}
                <mesh ref={tailRef} position={[0, 1.5, -2.5]} rotation={[Math.PI / 4, 0, 0]}>
                    <cylinderGeometry args={[0.3, 0.1, 4, 8]} />
                    <meshToonMaterial color={bodyColor} />
                </mesh>

                {/* Attack indicators */}
                {currentPhase === 'attack' && (
                    <AttackIndicator
                        pattern={attackState.currentPattern}
                        progress={attackState.patternProgress}
                    />
                )}

                {/* QTE UI */}
                {currentPhase === 'qte' && (
                    <QTEIndicator
                        type={qteState.currentQTE}
                        timeRemaining={qteState.timeRemaining}
                        successCount={qteState.successCount}
                        requiredCount={qteState.requiredCount}
                    />
                )}
            </group>
        );
    };

// Attack indicator component
const AttackIndicator: React.FC<{
    pattern: AttackPattern;
    progress: number;
}> = ({ pattern, progress }) => {
    const color = progress < 0.33 ? '#FFFF00' : progress < 0.66 ? '#FF8800' : '#FF0000';
    const label = `${pattern.toUpperCase()}!`;

    return (
        <Html center>
            <div style={{
                color: color,
                fontSize: '32px',
                fontWeight: 'bold',
                textShadow: '2px 2px 0 #000',
                fontFamily: 'Impact, sans-serif',
            }}>
                {label}
            </div>
        </Html>
    );
};

// QTE indicator component
const QTEIndicator: React.FC<{
    type: QTEType | null;
    timeRemaining: number;
    successCount: number;
    requiredCount: number;
}> = ({ type, timeRemaining, successCount, requiredCount }) => {
    const actionLabels: Record<QTEType, string> = {
        dodge: '← → DODGE',
        jump: '↑ JUMP',
        attack: 'ATTACK',
        defend: '↓ DEFEND',
    };

    return (
        <Html center>
            <div style={{
                position: 'relative',
                width: '200px',
                padding: '20px',
                background: 'rgba(0, 0, 0, 0.8)',
                border: '3px solid #FFD700',
                borderRadius: '10px',
                textAlign: 'center',
            }}>
                <div style={{
                    color: '#FF4444',
                    fontSize: '14px',
                    marginBottom: '10px',
                }}>
                    QTE - TIME: {timeRemaining.toFixed(1)}s
                </div>
                <div style={{
                    color: '#FFFFFF',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 0 #000',
                }}>
                    {type ? actionLabels[type] : 'GET READY!'}
                </div>
                <div style={{
                    color: '#44FF44',
                    fontSize: '18px',
                    marginTop: '10px',
                }}>
                    {'★'.repeat(successCount)}{'☆'.repeat(requiredCount - successCount)}
                </div>
            </div>
        </Html>
    );
};

export default GlobusBossPhases;
