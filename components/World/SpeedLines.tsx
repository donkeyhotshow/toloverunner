import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Group } from 'three';
import { useStore } from '../../store';

export const SpeedLines: React.FC = () => {
    const linesRef = useRef<Group>(null);
    const speedLinesActive = useStore(s => s.speedLinesActive);
    const isDashing = useStore(s => s.isDashing);
    const zenMode = useStore(s => s.zenMode);

    
    // Create random line segments
    const lines = useMemo(() => {
        return Array.from({ length: 40 }, () => ({
            position: [
                (Math.random() - 0.5) * 30, // X spread
                (Math.random() - 0.5) * 20, // Y spread
                -Math.random() * 50        // Z spread (in front of camera)
            ],
            scale: 1 + Math.random() * 3,
            rotation: Math.random() * Math.PI
        }));
    }, []);

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
            {lines.map((line, i) => (
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
