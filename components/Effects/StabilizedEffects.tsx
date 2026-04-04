/**
 * @license SPDX-License-ntifier: Apache-2.0
 *
 * StabilizedEffects - Стабилизированные визуальные эффекты
 *
 * Обеспечивает:
 * - Адаптивные эффекты на основе производительности
 * - Плавные переходы между уровнями качества
 * - Оптимизированные частицы и линии скорости
 * - Защиту от визуальных артефактов
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { RootState } from '@react-three/fiber';
import { Matrix4, InstancedMesh, MeshBasicMaterial, AdditiveBlending, Mesh, Vector3 } from 'three';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { safeDispose } from '../../utils/errorHandler';

// === Конфигурация эффектов по уровням качества ===
const EFFECT_CONFIGS = {
    [QualityLevel.LOW]: {
        speedLineCount: 20,
        particleCount: 30,
        trailLength: 5,
        glowIntensity: 0.3,
        updateFrequency: 2 // Обновлять каждый 2-й кадр
    },
    [QualityLevel.MEDIUM]: {
        speedLineCount: 40,
        particleCount: 60,
        trailLength: 10,
        glowIntensity: 0.5,
        updateFrequency: 1
    },
    [QualityLevel.HIGH]: {
        speedLineCount: 60,
        particleCount: 100,
        trailLength: 15,
        glowIntensity: 0.8,
        updateFrequency: 1
    },
    [QualityLevel.ULTRA]: {
        speedLineCount: 20, // Reduced from 80
        particleCount: 50,
        trailLength: 20,
        glowIntensity: 0.8,
        updateFrequency: 1
    }
};

// Pre-allocated Matrix4 for useFrame (avoid GC)
const _speedLineMatrix = new Matrix4();

// === Стабилизированные линии скорости ===
export const StabilizedSpeedLines: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const [config, setConfig] = useState(EFFECT_CONFIGS[QualityLevel.MEDIUM]);
    const frameCounter = useRef(0);
    const offsetsRef = useRef<Float32Array | null>(null);

    // Подписка на изменения качества
    useEffect(() => {
        const handleQualityChange = (e: CustomEvent) => {
            const newConfig = EFFECT_CONFIGS[e.detail.quality as QualityLevel];
            if (newConfig) setConfig(newConfig);
        };

        window.addEventListener('graphics-quality-changed', handleQualityChange as EventListener);
        return () => window.removeEventListener('graphics-quality-changed', handleQualityChange as EventListener);
    }, []);

    // Инициализация офсетов
    useEffect(() => {
        offsetsRef.current = new Float32Array(config.speedLineCount);
        for (let i = 0; i < config.speedLineCount; i++) {
            offsetsRef.current[i] = Math.random() * 100;
        }
    }, [config.speedLineCount]);

    const geometry = useMemo(() => getGeometryPool().getPlaneGeometry(0.08, 2.5), []);
    const material = useMemo(() => new MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.1, // Reduced from 0.25
        toneMapped: false,
        depthWrite: false,
        blending: AdditiveBlending
    }), []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    useEffect(() => {
        const callback = (_delta: number, time: number, _state: RootState) => {
            const { status, speed, speedBoostActive } = useStore.getState();
            if (status !== GameStatus.PLAYING || !meshRef.current || !offsetsRef.current) return;

            // Пропуск кадров для оптимизации
            frameCounter.current++;
            if (frameCounter.current % config.updateFrequency !== 0) return;

            const intensity = speedBoostActive ? 1.8 : 1.0;
            const baseSpeed = Math.max(20, speed || 30);
            const lineSpeed = baseSpeed * 25 * intensity;

            for (let i = 0; i < config.speedLineCount; i++) {
                const offset = offsetsRef.current?.[i];
                if (offset === undefined) continue;
                const z = ((time * lineSpeed * 0.01 + offset) % 40) - 20;
                const x = (Math.sin(offset * 0.5) * 0.5 + (Math.random() - 0.5) * 0.1) * 15;
                const y = (Math.cos(offset * 0.3) * 0.3 + Math.random() * 0.1) * 8 + 2;

                _speedLineMatrix.makeRotationY(Math.PI / 2);
                _speedLineMatrix.setPosition(x, y, z);
                meshRef.current.setMatrixAt(i, _speedLineMatrix);
            }

            meshRef.current.instanceMatrix.needsUpdate = true;
            material.opacity = speedBoostActive ? 0.6 * config.glowIntensity : 0.25 * config.glowIntensity;
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [config, material]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, config.speedLineCount]}
            frustumCulled={false}
        />
    );
};



// === Стабилизированный эффект свечения игрока ===
export const StabilizedPlayerGlow: React.FC<{ position?: Vector3 }> = ({ position }) => {
    const glowRef = useRef<Mesh>(null);
    const [config, setConfig] = useState(EFFECT_CONFIGS[QualityLevel.MEDIUM]);

    useEffect(() => {
        const handleQualityChange = (e: CustomEvent) => {
            const newConfig = EFFECT_CONFIGS[e.detail.quality as QualityLevel];
            if (newConfig) setConfig(newConfig);
        };

        window.addEventListener('graphics-quality-changed', handleQualityChange as EventListener);
        return () => window.removeEventListener('graphics-quality-changed', handleQualityChange as EventListener);
    }, []);

    const geometry = useMemo(() => getGeometryPool().getSphereGeometry(1.2, 16, 16), []);
    const material = useMemo(() => new MeshBasicMaterial({
        color: '#00ffff',
        transparent: true,
        opacity: 0.15 * config.glowIntensity,
        blending: AdditiveBlending,
        depthWrite: false
    }), [config.glowIntensity]);

    useEffect(() => {
        return () => {
            getGeometryPool().release(geometry);
            safeDispose(material);
        };
    }, [geometry, material]);

    useEffect(() => {
        const callback = (_delta: number, time: number, _state: RootState) => {
            if (!glowRef.current) return;

            const { combo, speedBoostActive, shieldActive } = useStore.getState();

            // Пульсация на основе комбо
            const pulseScale = 1 + Math.sin(time * 3) * 0.1 * (1 + combo * 0.05);
            glowRef.current.scale.setScalar(pulseScale);

            // Изменение цвета в зависимости от состояния
            if (glowRef.current.material) {
                const mat = glowRef.current.material as MeshBasicMaterial;
                if (shieldActive) {
                    mat.color.setHex(0x00ff00);
                } else if (speedBoostActive) {
                    mat.color.setHex(0xff8800);
                } else if (combo > 5) {
                    mat.color.setHex(0xffff00);
                } else {
                    mat.color.setHex(0x00ffff);
                }
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, []);

    if (config.glowIntensity < 0.3) return null;

    return (
        <mesh ref={glowRef} position={position || [0, 0.5, 0]} geometry={geometry} material={material} />
    );
};

// === Главный компонент стабилизированных эффектов ===
export const StabilizedEffects: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState(true);

    useEffect(() => {
        // Проверяем минимальный режим рендеринга
        const checkMinimalMode = () => {
            const isMinimal = (window as unknown as { __TOLOVERUNNER_MINIMAL_RENDER__?: boolean }).__TOLOVERUNNER_MINIMAL_RENDER__ === true;
            setIsEnabled(!isMinimal);
        };

        checkMinimalMode();
        window.addEventListener('emergency-mode', checkMinimalMode);
        return () => window.removeEventListener('emergency-mode', checkMinimalMode);
    }, []);

    if (!isEnabled) return null;

    return (
        <group name="stabilized-effects">
            <StabilizedSpeedLines />
        </group>
    );
};

export default StabilizedEffects;
