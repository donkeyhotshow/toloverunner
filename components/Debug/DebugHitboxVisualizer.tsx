/**
 * DebugHitboxVisualizer - Визуализация хитбоксов для отладки
 * 
 * Активация: Нажмите 'D' для включения/выключения
 * 
 * Показывает:
 * - Зеленый круг: хитбокс игрока (radius 0.5)
 * - Красные круги: хитбоксы препятствий (radius 0.6)
 * - Желтые круги: хитбоксы бонусов (radius 1.5)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Group, MeshBasicMaterial, SphereGeometry, Mesh } from 'three';
import { useStore } from '../../store';
import { UI_LAYERS } from '../../constants';
import { GameObject, ObjectType } from '../../types';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';

interface DebugHitboxVisualizerProps {
    objectsRef: React.MutableRefObject<GameObject[]>;
    totalDistanceRef: React.MutableRefObject<number>;
}

function getDebugFromUrl(): boolean {
    try {
        return new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
        return false;
    }
}

export const DebugHitboxVisualizer: React.FC<DebugHitboxVisualizerProps> = ({
    objectsRef,
    totalDistanceRef
}) => {
    const [debugMode, setDebugMode] = useState(getDebugFromUrl);
    const playerPosition = useStore(state => state.localPlayerState.position);

    const obstaclesGroupRef = useRef<Group>(null);
    const bonusesGroupRef = useRef<Group>(null);

    // Материалы для хитбоксов
    const playerMaterial = useMemo(() => new MeshBasicMaterial({
        color: '#00FF00',
        wireframe: true,
        transparent: true,
        opacity: 0.5
    }), []);

    const obstacleMaterial = useMemo(() => new MeshBasicMaterial({
        color: '#FF0000',
        wireframe: true,
        transparent: true,
        opacity: 0.5
    }), []);

    const bonusMaterial = useMemo(() => new MeshBasicMaterial({
        color: '#FFFF00',
        wireframe: true,
        transparent: true,
        opacity: 0.4
    }), []);

    // Геометрии
    const playerGeo = useMemo(() => new SphereGeometry(0.5, 16, 16), []); // PLAYER_RADIUS
    const obstacleGeo = useMemo(() => new SphereGeometry(0.6, 16, 16), []); // OBSTACLE_RADIUS
    const bonusGeo = useMemo(() => new SphereGeometry(1.5, 16, 16), []); // PICKUP_RADIUS

    // Включение по ?debug=1 уже в начальном состоянии; переключение по 'D'
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'd' || e.key === 'D') {
                setDebugMode(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // Обновление визуализации хитбоксов
    useEffect(() => {
        if (!debugMode) return;

        const callback = (_delta: number, _time: number) => {
            if (!obstaclesGroupRef.current || !bonusesGroupRef.current) return;

            const objects = objectsRef.current;
            const totalDist = totalDistanceRef.current;

            // Очищаем предыдущие хитбоксы
            obstaclesGroupRef.current.clear();
            bonusesGroupRef.current.clear();

            for (let i = 0; i < objects.length; i++) {
                const obj = objects[i];
                if (!obj || !obj.active) continue;

                const worldZ = obj.position[2] + totalDist;
                if (worldZ > 20 || worldZ < -150) continue;

                const mesh = new Mesh(
                    obj.type === ObjectType.OBSTACLE ? obstacleGeo : bonusGeo,
                    obj.type === ObjectType.OBSTACLE ? obstacleMaterial : bonusMaterial
                );

                mesh.position.set(
                    obj.position[0],
                    obj.position[1] + 0.8,
                    worldZ
                );

                if (obj.type === ObjectType.OBSTACLE) {
                    obstaclesGroupRef.current.add(mesh);
                } else {
                    bonusesGroupRef.current.add(mesh);
                }
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [debugMode, objectsRef, totalDistanceRef, obstacleGeo, bonusGeo, obstacleMaterial, bonusMaterial]);

    // Cleanup
    useEffect(() => {
        return () => {
            playerGeo.dispose();
            obstacleGeo.dispose();
            bonusGeo.dispose();
            playerMaterial.dispose();
            obstacleMaterial.dispose();
            bonusMaterial.dispose();
        };
    }, [playerGeo, obstacleGeo, bonusGeo, playerMaterial, obstacleMaterial, bonusMaterial]);

    if (!debugMode) return null;

    return (
        <group>
            {/* Хитбокс игрока */}
            <mesh
                position={[playerPosition[0], playerPosition[1], 0]}
                geometry={playerGeo}
                material={playerMaterial}
            />

            {/* Хитбоксы препятствий */}
            <group ref={obstaclesGroupRef} />

            {/* Хитбоксы бонусов */}
            <group ref={bonusesGroupRef} />

            {/* Debug UI overlay */}
            <Html position={[0, 10, 0]}>
                <div className="bg-black/80 text-green-400 px-4 py-2 rounded font-mono text-sm">
                    🐛 DEBUG MODE (Press 'D' to toggle)
                    <br />
                    <span className="text-green-500">Green</span>: Player (r=0.5)
                    <br />
                    <span className="text-red-500">Red</span>: Obstacles (r=0.6)
                    <br />
                    <span className="text-yellow-500">Yellow</span>: Bonuses (r=1.5)
                </div>
            </Html>
        </group>
    );
};

// HTML helper from @react-three/drei
function Html({ children }: { position: [number, number, number]; children: React.ReactNode }) {
    return (
        <div
            style={{
                position: 'fixed',
                top: '50%',
                right: '20px',
                transform: 'translateY(-50%)',
                zIndex: UI_LAYERS.OVERLAY
            }}
        >
            {children}
        </div>
    );
}

export default DebugHitboxVisualizer;
