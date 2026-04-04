/**
 * MinimalScene - Минимальная сцена для диагностики производительности
 * ТОЛЬКО 1 вращающийся куб для проверки базового FPS
 */

import React, { useRef, useEffect } from 'react';
import { Mesh } from 'three';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';

export const MinimalScene: React.FC = () => {
    const cubeRef = useRef<Mesh>(null);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            if (cubeRef.current) {
                cubeRef.current.rotation.x = time;
                cubeRef.current.rotation.y = time * 0.5;
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, []);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} />

            <mesh ref={cubeRef}>
                <boxGeometry args={[2, 2, 2]} />
                <meshStandardMaterial color="#00ff00" />
            </mesh>
        </>
    );
};
