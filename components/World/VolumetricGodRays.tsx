/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three'; // Імпорт THREE
import { DoubleSide, AdditiveBlending } from 'three';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';

// Генерація випадкових значень поза компонентом
const generateRandomRays = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        id: i,
        rotation: [Math.random() * Math.PI, 0, (Math.random() - 0.5) * 0.5] as [number, number, number],
        position: [
            (Math.random() - 0.5) * 40,
            30 + Math.random() * 20,
            -100 - Math.random() * 200
        ] as [number, number, number],
        scale: [1 + Math.random() * 5, 100 + Math.random() * 200, 1 + Math.random() * 5] as [number, number, number],
        opacity: 0.05 + Math.random() * 0.1,
        speed: 0.1 + Math.random() * 0.2
    }));
};

interface VolumetricGodRaysProps {
    color?: string;
}

export const VolumetricGodRays: React.FC<VolumetricGodRaysProps> = ({ color = "#FFFACD" }) => {
    const raysRef = useRef<THREE.Group>(null);

    // Create a set of "light beams" (cylinders)
    const count = 6;
    const items = useMemo(() => generateRandomRays(count), []);

    const geo = useMemo(() => getGeometryPool().getCylinderGeometry(1, 1, 1, 16, 1, true), []);

    useFrame((state) => {
        if (!raysRef.current) return;

        const time = state.clock.elapsedTime;
        raysRef.current.children.forEach((ray, i) => {
            const data = items[i];
            if (!data || !ray) return;
            const pos0 = data.position[0] ?? 0;
            const speed = data.speed ?? 0.1;
            ray.position.x = pos0 + Math.sin(time * speed) * 5;
            // Stable sway to avoid frame-to-frame jitter from random()
            ray.rotation.z = (data.rotation[2] ?? 0) + Math.sin(time * (0.2 + speed)) * 0.1;
        });
    });

    return (
        <group ref={raysRef} name="god-rays">
            {items.map((item) => (
                <mesh
                    key={item.id}
                    geometry={geo}
                    position={item.position}
                    rotation={item.rotation}
                    scale={item.scale}
                >
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={item.opacity * 0.75} // more visible rays
                        blending={AdditiveBlending}
                        side={DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
};
