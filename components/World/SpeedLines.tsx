import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Group } from 'three';
import { useStore } from '../../store';

// Pre-computed static line data (deterministic, avoids impure Math.random in render)
const SPEED_LINE_DATA = Array.from({ length: 40 }, (_, i) => {
    const t = i / 40;
    return {
        position: [
            (((i * 7 + 13) % 40) / 40 - 0.5) * 30,
            (((i * 11 + 7) % 40) / 40 - 0.5) * 20,
            -(((i * 3 + 17) % 40) / 40) * 50,
        ] as [number, number, number],
        scale: 1 + t * 3,
        rotation: t * Math.PI,
    };
});

export const SpeedLines: React.FC = () => {
    const linesRef = useRef<Group>(null);
    const speedLinesActive = useStore(s => s.speedLinesActive);
    const isDashing = useStore(s => s.isDashing);
    const zenMode = useStore(s => s.zenMode);

    useFrame((_state, delta) => {
        if (!linesRef.current) return;
        
        const opacity = MathUtils.lerp(
            linesRef.current.visible ? 1 : 0, 
            (speedLinesActive || isDashing) && !zenMode ? 1 : 0, 
            delta * 5

        );
        
        if (opacity < 0.01) {
            linesRef.current.visible = false;
            return;
        }
        
        linesRef.current.visible = true;
        
        // Pulse visibility or scroll?
        // Let's scroll them towards the camera
        linesRef.current.children.forEach((line) => {
            line.position.z += delta * 150; // Fly through speed
            if (line.position.z > 5) {
                line.position.z = -45; // Reset to far away
            }
        });
    });

    return (
        <group ref={linesRef} visible={false}>
            {SPEED_LINE_DATA.map((line, i) => (
                <mesh key={i} position={line.position as [number, number, number]} rotation-z={line.rotation}>
                    <planeGeometry args={[0.05, line.scale]} />
                    <meshBasicMaterial 
                        color="white" 
                        transparent 
                        opacity={0.25} 
                        depthWrite={false}
                        toneMapped={false}

                    />
                </mesh>
            ))}
        </group>
    );
};
