/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SpeedLinesEffect - Radial speed lines for velocity feedback
 * 
 * Activates during high speed and Dash to create motion blur effect
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { InstancedMesh, PlaneGeometry, MeshBasicMaterial, AdditiveBlending, DoubleSide, Object3D, MathUtils } from 'three';
import { useStore } from '../../store';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { GameStatus } from '../../types';

const SPEED_LINE_CONFIG = {
    LINE_COUNT: 50,
    ACTIVATION_SPEED: 15, // Speed threshold to start showing lines
    DASH_OPACITY: 0.9, // Full opacity during Dash
    SPEED_OPACITY: 0.4, // Partial opacity during normal high speed
    FADE_SPEED: 4.0, // How fast lines fade in/out
    LINE_LENGTH: 8.0,
    LINE_WIDTH: 0.15,
    RADIAL_OFFSET: 12.0, // Distance from center vanishing point
    LINE_COLOR: 0xF0FFFF, // Alice Blue (white with slight blue tint)
    Z_POSITION: -5.0 // Position in front of camera
};

const SpeedLinesEffect: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const currentOpacity = useRef(0);
    const targetOpacity = useRef(0);

    // Create line geometry (thin quad)
    const lineGeometry = useMemo(() => {
        const geo = new PlaneGeometry(
            SPEED_LINE_CONFIG.LINE_WIDTH,
            SPEED_LINE_CONFIG.LINE_LENGTH
        );
        return geo;
    }, []);

    // Material with additive blending for glow effect
    const lineMaterial = useMemo(() => {
        return new MeshBasicMaterial({
            color: SPEED_LINE_CONFIG.LINE_COLOR,
            transparent: true,
            opacity: 0,
            blending: AdditiveBlending,
            side: DoubleSide,
            depthWrite: false
        });
    }, []);

    useEffect(() => {
        return () => {
            lineGeometry.dispose();
            lineMaterial.dispose();
        };
    }, [lineGeometry, lineMaterial]);

    useEffect(() => {
        if (!meshRef.current) return;

        // Initialize line positions in circular pattern
        const _dummy = new Object3D();
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // Golden angle for even distribution

        for (let i = 0; i < SPEED_LINE_CONFIG.LINE_COUNT; i++) {
            const angle = i * goldenAngle;
            const radius = SPEED_LINE_CONFIG.RADIAL_OFFSET;

            // Position lines radially around screen edges
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            _dummy.position.set(x, y, SPEED_LINE_CONFIG.Z_POSITION);

            // Rotate line to point away from center (vanishing point effect)
            _dummy.lookAt(0, 0, SPEED_LINE_CONFIG.Z_POSITION);
            _dummy.rotateZ(Math.PI / 2); // Rotate 90° so length extends radially

            _dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, _dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, []);

    useEffect(() => {
        const callback = (delta: number, _time: number) => {
            if (!meshRef.current) return;

            const state = useStore.getState();
            // ✅ FIX TS: 'currentSpeed' does not exist on GameState, use 'speed' instead
            const { status, speed, isDashing } = state;

            if (status !== GameStatus.PLAYING) {
                targetOpacity.current = 0;
            } else {
                // Determine target opacity based on speed and dash state
                if (isDashing) {
                    targetOpacity.current = SPEED_LINE_CONFIG.DASH_OPACITY;
                } else if (speed >= SPEED_LINE_CONFIG.ACTIVATION_SPEED) {
                    // Fade in proportionally to speed above threshold
                    const speedRatio = Math.min(
                        (speed - SPEED_LINE_CONFIG.ACTIVATION_SPEED) / 10,
                        1.0
                    );
                    targetOpacity.current = speedRatio * SPEED_LINE_CONFIG.SPEED_OPACITY;
                } else {
                    targetOpacity.current = 0;
                }
            }

            // Smooth fade transition
            const safeDelta = Math.min(delta, 0.05);
            currentOpacity.current = MathUtils.lerp(
                currentOpacity.current,
                targetOpacity.current,
                safeDelta * SPEED_LINE_CONFIG.FADE_SPEED
            );

            // Update material opacity
            lineMaterial.opacity = currentOpacity.current;
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [lineMaterial]);

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[lineGeometry, lineMaterial, SPEED_LINE_CONFIG.LINE_COUNT]}
                frustumCulled={false}
                renderOrder={1000} // Render on top
            />
        </group>
    );
};

SpeedLinesEffect.displayName = 'SpeedLinesEffect';
export default SpeedLinesEffect;
