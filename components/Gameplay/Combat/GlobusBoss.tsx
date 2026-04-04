// @ts-nocheck
/**
 * GLOBUS_BOSS - Boss Component v2.4.0
 * Large enemy at the end of each biome with HP bar and attack patterns
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { eventBus } from '../../../utils/eventBus';

interface BossProps {
    position: [number, number, number];
    maxHp: number;
    onDefeat?: () => void;
    onHit?: (damage: number) => void;
}

// Boss states
export type BossState = 'idle' | 'attacking' | 'hurt' | 'defeated';

// Attack patterns
export type BossAttack = 'slap' | 'spit' | 'tired';

export const GlobusBoss: React.FC<BossProps> = ({
    position,
    maxHp = 100,
    onDefeat,
    onHit
}) => {
    const [currentHp, setCurrentHp] = useState(maxHp);
    const [bossState, setBossState] = useState<BossState>('idle');
    const [currentAttack, setCurrentAttack] = useState<BossAttack>('slap');
    const groupRef = useRef<THREE.Group>(null);
    const tailRef = useRef<THREE.Mesh>(null);
    const attackTimerRef = useRef(0);
    const hurtTimerRef = useRef(0);

    // Colors based on state
    const bodyColor = useMemo(() => {
        switch (bossState) {
            case 'hurt': return '#FF4444';
            case 'defeated': return '#444444';
            default: return '#B22222';
        }
    }, [bossState]);

    // Attack cycle timer
    useFrame((_, delta) => {
        if (bossState === 'defeated') return;

        attackTimerRef.current += delta;

        // Cycle attacks every 3 seconds
        if (attackTimerRef.current > 3 && bossState === 'idle') {
            attackTimerRef.current = 0;
            const attackTypes: BossAttack[] = ['slap', 'spit'];
            const nextAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
            setCurrentAttack(nextAttack);
            setBossState('attacking');

            // Return to idle after attack
            setTimeout(() => {
                if (bossState !== 'defeated') {
                    setBossState('idle');
                }
            }, 1500);
        }

        // Handle hurt state timer
        if (bossState === 'hurt') {
            hurtTimerRef.current += delta;
            if (hurtTimerRef.current > 0.5) {
                hurtTimerRef.current = 0;
                setBossState('idle');
            }
        }

        // Animate tail based on state
        if (tailRef.current) {
            const time = Date.now() * 0.001;
            if (bossState === 'attacking') {
                tailRef.current.rotation.z = Math.sin(time * 10) * 0.5;
            } else if (bossState === 'hurt') {
                tailRef.current.rotation.z = Math.sin(time * 20) * 0.3;
            } else {
                tailRef.current.rotation.z = Math.sin(time * 2) * 0.1;
            }
        }
    });

    // Take damage
    const _takeDamage = (damage: number) => {
        if (bossState === 'defeated') return;

        const newHp = Math.max(0, currentHp - damage);
        setCurrentHp(newHp);
        setBossState('hurt');
        hurtTimerRef.current = 0;

        // Emit hit event for effects
        eventBus.emit('combat:boss_hit');

        // Check for defeat
        if (newHp <= 0) {
            setBossState('defeated');
            onDefeat?.();
            eventBus.emit('combat:boss_defeated');
        }

        onHit?.(damage);
    };

    // Expose takeDamage to parent
    useEffect(() => {
        // Register boss for damage system
        return () => {
            // Cleanup on unmount
        };
    }, []);

    // HP percentage
    const hpPercent = (currentHp / maxHp) * 100;

    if (bossState === 'defeated') {
        return null; // Don't render defeated boss
    }

    return (
        <group ref={groupRef} position={position}>
            {/* HP Bar */}
            <group position={[0, 5, 0]}>
                {/* Bar background */}
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[8, 1]} />
                    <meshBasicMaterial color="#333333" />
                </mesh>
                {/* HP fill */}
                <mesh position={[-(4 - (hpPercent / 100) * 4), 0, 0.01]}>
                    <planeGeometry args={[hpPercent / 100 * 8, 0.8]} />
                    <meshBasicMaterial color={hpPercent > 30 ? '#44FF44' : '#FF4444'} />
                </mesh>
                {/* HP Text */}
                <Text
                    position={[0, 0, 0.02]}
                    fontSize={0.5}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                >
                    {currentHp} / {maxHp}
                </Text>
            </group>

            {/* Boss Body */}
            <mesh position={[0, 2, 0]}>
                <sphereGeometry args={[2.5, 32, 32]} />
                <meshToonMaterial color={bodyColor} />
            </mesh>

            {/* Boss Eyes */}
            <mesh position={[-0.8, 2.5, 2]}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0.8, 2.5, 2]}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            {/* Pupils */}
            <mesh position={[-0.8, 2.5, 2.3]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[0.8, 2.5, 2.3]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Tail */}
            <mesh ref={tailRef} position={[0, 1, -2.5]} rotation={[Math.PI / 4, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.1, 4, 8]} />
                <meshToonMaterial color={bodyColor} />
            </mesh>

            {/* Attack indicators */}
            {bossState === 'attacking' && currentAttack === 'slap' && (
                <mesh position={[0, 1, 3]} rotation={[0, 0, Math.PI / 4]}>
                    <boxGeometry args={[3, 0.5, 0.5]} />
                    <meshBasicMaterial color="#FF0000" transparent opacity={0.5} />
                </mesh>
            )}
            {bossState === 'attacking' && currentAttack === 'spit' && (
                <mesh position={[0, 3, 0]}>
                    <sphereGeometry args={[0.5, 16, 16]} />
                    <meshBasicMaterial color="#00FF00" transparent opacity={0.7} />
                </mesh>
            )}
        </group>
    );
};

export default GlobusBoss;
