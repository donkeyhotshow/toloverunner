/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { Group, MeshStandardMaterial, Vector3, MathUtils } from 'three';
import { useRef } from 'react';
import { SAFETY_CONFIG } from '../../constants';

// Simple SpermTail component placeholder
const SpermTail: React.FC = () => (
    <group>
        {/* Simplified tail for now */}
        <mesh position={[0, 0, -0.5]}>
            <cylinderGeometry args={[0.1, 0.05, 1, 8]} />
            <meshStandardMaterial color="#dddddd" />
        </mesh>
    </group>
);

export const PlayerVisual: React.FC = () => {
    const scaleRef = useRef<Group>(null);
    const materialRef = useRef<MeshStandardMaterial>(null);

    // Store access for animation states
    const isJumping = useStore(s => s.localPlayerState.isJumping);
    const isDashing = useStore(s => s.isDashing);
    // const verticalVelocity = useStore(s => s.localPlayerState.velocity[1]); // Unused


    useFrame((_state, delta) => {
        if (!scaleRef.current) return;
        const safeDelta = Math.max(SAFETY_CONFIG.MIN_DELTA_TIME, Math.min(SAFETY_CONFIG.MAX_DELTA_TIME, delta));

        const targetScale = new Vector3(1, 1, 1);
        const LERP_SPEED = 15.0;

        if (isDashing) {
            // 🚀 DASH: Extreme Z Stretch, narrow X/Y
            targetScale.set(0.7, 0.7, 1.8);
        } else if (isJumping) {
            // 🦘 JUMP: Stretch vertically/Z (upwards motion) - actually stretch along movement vector?
            // For now simple Z stretch 
            targetScale.set(0.8, 0.8, 1.4);
        } else {
            // 🛬 LANDING / RUNNING: 
            // Ideally detecting "just landed" for squash, but for now simple recovery
            // Could add subtle run bobbing here later

            // If we just landed (velocity < -10 and not jumping)... might be hard to detect without event.
            // Let's stick to state drive for now.
            targetScale.set(1, 1, 1);
        }

        // Smoothly interpolate current scale to target
        scaleRef.current.scale.lerp(targetScale, safeDelta * LERP_SPEED);

        // Optional: Pulse emission on Dash
        if (materialRef.current) {
            const targetEmissive = isDashing ? 1.0 : 0.1;
            materialRef.current.emissiveIntensity = MathUtils.lerp(
                materialRef.current.emissiveIntensity,
                targetEmissive,
                safeDelta * 10
            );
        }
    });

    return (
        <group ref={scaleRef}>
            {/* HEAD - FIXED: Using meshStandardMaterial instead of OptimizedOrganicMaterial */}
            <mesh castShadow receiveShadow position={[0, 0, 0.5]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshStandardMaterial
                    ref={materialRef}
                    color="#eeeeee"
                    emissive="#ffffff"
                    emissiveIntensity={0.1}
                    roughness={0.5}
                    metalness={0.1}
                />
            </mesh>

            {/* EYES */}
            <group position={[0, 0.1, 0.9]}>
                <mesh position={[-0.15, 0, 0]}>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[-0.15, 0, 0.1]}>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshBasicMaterial color="black" />
                </mesh>

                <mesh position={[0.15, 0, 0]}>
                    <sphereGeometry args={[0.12, 16, 16]} />
                    <meshBasicMaterial color="white" />
                </mesh>
                <mesh position={[0.15, 0, 0.1]}>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshBasicMaterial color="black" />
                </mesh>
            </group>

            {/* MOUTH (Simple smile) */}
            <mesh position={[0, -0.15, 0.9]} rotation={[0.2, 0, 0]}>
                <torusGeometry args={[0.1, 0.02, 8, 16, Math.PI]} />
                <meshBasicMaterial color="black" />
            </mesh>

            {/* COWBOY HAT */}
            <group position={[0, 0.4, 0.4]} rotation={[-0.2, 0, 0]}>
                <mesh position={[0, 0, 0]}>
                    <cylinderGeometry args={[0.6, 0.6, 0.05, 32]} />
                    <meshStandardMaterial color="#8B4513" />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.4, 32]} />
                    <meshStandardMaterial color="#8B4513" />
                </mesh>
            </group>

            {/* TAIL (Procedural Wiggle) */}
            <SpermTail />
        </group>
    );
};

PlayerVisual.displayName = 'PlayerVisual';
