/**
 * FinishEgg - Визуальная цель на горизонте
 */
import React, { useRef, useMemo } from 'react';
import { Mesh, Group, MeshToonMaterial, MeshBasicMaterial, BackSide } from 'three';
import { applyWorldBending } from './WorldBendingShader';
import { useFrame } from '@react-three/fiber';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { Outlines } from '../System/OutlinesShim';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';

// Update Props to receive distance
interface FinishEggProps {
    totalDistanceRef?: React.MutableRefObject<number>;
    winDistance?: number;
}

export const FinishEgg: React.FC<FinishEggProps> = ({ totalDistanceRef, winDistance = 3000 }) => {
    const meshRef = useRef<Mesh>(null);
    const glowRef = useRef<Mesh>(null);
    const groupRef = useRef<Group>(null);
    const pm = getPerformanceManager();
    const showOutlines = typeof Outlines !== 'undefined' && pm.getCurrentQuality() >= QualityLevel.MEDIUM;

    // Геометрия яйцеклетки (Сфера)
    const eggGeo = useMemo(() => getGeometryPool().getSphereGeometry(15, 32, 32), []);

    // Материал: Золотистое сияние - Fixed colors
    const eggMat = useMemo(() => {
        const mat = new MeshToonMaterial({
            color: '#FFD700', // Gold
            emissive: '#FFA500', // Orange glow
            emissiveIntensity: 0.8,
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    // Свечение вокруг
    const glowGeo = useMemo(() => getGeometryPool().getSphereGeometry(18, 16, 16), []);
    const glowMat = useMemo(() => {
        const mat = new MeshBasicMaterial({
            color: '#FFFFE0', // Light Yellow
            transparent: true,
            opacity: 0.6,
            side: BackSide,
        });
        applyWorldBending(mat);
        return mat;
    }, []);

    // Анимация пульсации и позиционирования
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // 1. Position Logic
        if (groupRef.current) {
            // Default to far away if no ref provided (preview mode)
            const currentDist = totalDistanceRef ? totalDistanceRef.current : 0;
            const remainingDist = winDistance - currentDist;

            // Position: Starts at -WinDistance, moves closer to 0 as we run.
            // Wait, standard runner logic: Objects move +Z. Player is at 0.
            // If the finish line is at "3000m", and we ran "0m", it is at Z = -3000.
            // If we ran "2900m", it is at Z = -100.
            // So Z = -(WinDistance - TotalDistance)

            let targetZ = -(remainingDist);

            // Safety clamp: Don't let it pass behind too much?
            // Actually, if we win, we might pass it.
            groupRef.current.position.z = targetZ;
            groupRef.current.position.y = 10; // Levitate

            // Hide if too far to save render cost (optional, but good for focus)
            groupRef.current.visible = targetZ > -900; // Only visible in last 900m (draw distance + buffer)
        }

        if (meshRef.current) {
            const scale = 1 + Math.sin(t * 1.5) * 0.05;
            meshRef.current.scale.setScalar(scale);

            // Вращение
            meshRef.current.rotation.y = t * 0.2;
            meshRef.current.rotation.z = Math.sin(t * 0.5) * 0.1;
        }
        if (glowRef.current) {
            const scale = 1 + Math.sin(t * 2.0) * 0.1;
            glowRef.current.scale.setScalar(scale);
        }
    });

    return (
        <group ref={groupRef} position={[0, 10, -3000]}>
            <mesh ref={meshRef} geometry={eggGeo} material={eggMat}>
                {showOutlines ? <Outlines thickness={2} color="#000000" /> : null}
                {/* Лицо яйцеклетки */}
                <mesh position={[0, 2, 13]} rotation={[0, 0, 0]}>
                    <sphereGeometry args={[3, 16, 16]} />
                    <meshBasicMaterial color="black" />
                </mesh>
                <mesh position={[-5, 2, 12]} rotation={[0, 0, -0.2]}>
                    <sphereGeometry args={[3, 16, 16]} />
                    <meshBasicMaterial color="black" />
                </mesh>
                <mesh position={[5, 2, 12]} rotation={[0, 0, 0.2]}>
                    <sphereGeometry args={[3, 16, 16]} />
                    <meshBasicMaterial color="black" />
                </mesh>
                <mesh position={[0, -4, 12]} rotation={[0.5, 0, 0]}>
                    <torusGeometry args={[4, 1.2, 8, 20, 3.14]} />
                    <meshBasicMaterial color="black" />
                </mesh>
            </mesh>
            <mesh ref={glowRef} geometry={glowGeo} material={glowMat} />
        </group>
    );
};

export default FinishEgg;
