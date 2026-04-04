import React, { useMemo, useRef, useEffect } from 'react';
import { RootState } from '@react-three/fiber';
import { InstancedMesh, Object3D, MeshLambertMaterial } from 'three';
import { useStore } from '../../store';
import { CurveHelper } from '../../core/utils/CurveHelper';
import { scheduleMatrixUpdate } from '../System/InstanceUpdateScheduler';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';

interface DNATrackProps {
    length?: number;
    speed?: number;
    isMoving?: boolean;
    position?: [number, number, number];
}

// Geometries moved inside component useMemo for pooling


export const DNATrack: React.FC<DNATrackProps> = ({
    length = 100,
    speed = 1,
    isMoving = true,
    position = [0, 0, 0]
}) => {
    const meshRef = useRef<InstancedMesh>(null);
    const spheresRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    const frameSkip = useRef(0);

    const count = Math.min(Math.floor(length / 2.5), 40); // Optimized count

    const segmentGeo = useMemo(() => getGeometryPool().getCylinderGeometry(0.1, 0.1, 2, 8), []);
    const sphereGeo = useMemo(() => getGeometryPool().getSphereGeometry(0.3, 12, 12), []);

    // Use simpler MeshLambertMaterial instead of MeshStandardMaterial for performance
    const dnaMaterial = useMemo(() => new MeshLambertMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 0.8, // Increased for Bloom
        transparent: true,
        opacity: 0.3
    }), []);

    const sphereMaterial = useMemo(() => new MeshLambertMaterial({
        color: '#ffffff',
        emissive: '#ffffff',
        emissiveIntensity: 1.0, // Increased for Bloom
        transparent: true,
        opacity: 0.5
    }), []);

    useEffect(() => {
        return () => {
            const pool = getGeometryPool();
            pool.release(segmentGeo);
            pool.release(sphereGeo);
            safeDispose(dnaMaterial);
            safeDispose(sphereMaterial);
        };
    }, [segmentGeo, sphereGeo, dnaMaterial, sphereMaterial]);

    useEffect(() => {
        const callback = (_delta: number, timeIn: number, _state: RootState) => {
            // Frame throttling - update every 2nd frame
            frameSkip.current++;
            if (frameSkip.current % 2 !== 0) return;

            if (!meshRef.current || !spheresRef.current) return;

            const distance = useStore.getState().distance;
            const time = timeIn * speed;
            const segmentSpacing = length / count;

            for (let i = 0; i < count; i++) {
                const zOffset = i * segmentSpacing;
                const z = -zOffset + (isMoving ? (distance % length) : 0);

                const curve = CurveHelper.getCurveAt(z);
                if (!curve) continue; // Safety check

                const angle = time + i * 0.4;
                const radius = 3.5;

                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);

                const x1 = curve.x + cosA * radius;
                const y1 = curve.y + sinA * radius;

                const x2 = curve.x - cosA * radius;
                const y2 = curve.y - sinA * radius;

                // Central bar
                dummy.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
                dummy.lookAt(x1, y1, z);
                dummy.rotation.z += Math.PI / 2;
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);

                // Sphere 1
                dummy.position.set(x1, y1, z);
                dummy.rotation.set(0, 0, 0);
                dummy.updateMatrix();
                spheresRef.current.setMatrixAt(i * 2, dummy.matrix);

                // Sphere 2
                dummy.position.set(x2, y2, z);
                dummy.updateMatrix();
                spheresRef.current.setMatrixAt(i * 2 + 1, dummy.matrix);
            }

            // Use batch scheduler instead of direct updates
            scheduleMatrixUpdate(meshRef.current);
            scheduleMatrixUpdate(spheresRef.current);
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [length, speed, isMoving, count, dummy]);

    return (
        <group position={position}>
            <instancedMesh ref={meshRef} args={[segmentGeo, dnaMaterial, count]} />
            <instancedMesh ref={spheresRef} args={[sphereGeo, sphereMaterial, count * 2]} />
        </group>
    );
};
