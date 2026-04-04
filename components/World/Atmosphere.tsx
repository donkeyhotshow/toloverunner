/**
 * Atmosphere - ОБНОВЛЕННАЯ ВЕРСИЯ
 * 
 * Изменения:
 * - Градиент фона: темно-пурпурный внизу → розовый вверху (вместо белого)
 * - Плавающие эритроциты (красные кружочки) вместо пузырей
 * - Улучшенная органическая атмосфера
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { InstancedMesh, MeshToonMaterial, DoubleSide, MeshBasicMaterial, Object3D, ShaderMaterial, Color, BackSide, Mesh } from 'three';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { safeDispose } from '../../utils/errorHandler';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import DNABackground from './DNABackground';

export const Atmosphere: React.FC = () => {
    const erythrocytesRef = useRef<InstancedMesh>(null); // Красные кровяные клетки
    const dustRef = useRef<InstancedMesh>(null);
    const skyRef = useRef<Mesh>(null);

    // 🔴 Эритроциты (красные кровяные клетки) - плоские овалы
    const erythrocyteGeo = useMemo(() => {
        // Используем сплюснутую сферу для эффекта "диска"
        const geo = getGeometryPool().getSphereGeometry(1.0, 12, 12);
        const positions = geo.attributes.position;

        // Сплющиваем по Y для эффекта "бублика"
        if (positions) {
            for (let i = 0; i < positions.count; i++) {
                const y = positions.getY(i);
                positions.setY(i, y * 0.3); // Делаем плоским
            }
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    const erythrocyteMat = useMemo(() => new MeshToonMaterial({
        color: '#8b0000', // Більш темний, венозний колір
        emissive: '#4b0000',
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.8, 
        side: DoubleSide,
        dithering: true
    }), []);

    const dustGeo = useMemo(() => getGeometryPool().getBoxGeometry(0.2, 0.2, 2.0), []);
    const dustMat = useMemo(() => new MeshBasicMaterial({
        color: '#ffccbc', // Pale Skin Dust
        transparent: true,
        opacity: 0.2,
    }), []);

    useEffect(() => {
        const temp = new Object3D();

        // Инициализация эритроцитов (плавающие кровяные клетки)
        if (erythrocytesRef.current) {
            for (let i = 0; i < 40; i++) { // Reduced count from 150 to 40
                temp.position.set(
                    (Math.random() - 0.5) * 100,
                    (Math.random() - 0.5) * 50 + 15,
                    (Math.random() - 0.5) * 400 - 100
                );

                // Случайная ориентация
                temp.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );

                const scale = 0.5 + Math.random() * 1.5;
                temp.scale.set(scale, scale * 0.3, scale);
                temp.updateMatrix();
                erythrocytesRef.current.setMatrixAt(i, temp.matrix);
            }
            erythrocytesRef.current.instanceMatrix.needsUpdate = true;
        }

        // Инициализация пыли
        if (dustRef.current) {
            for (let i = 0; i < 25; i++) { // Reduced count from 200 to 25
                temp.position.set(
                    (Math.random() - 0.5) * 40,
                    (Math.random() - 0.5) * 30 + 5,
                    Math.random() * -300
                );
                temp.scale.setScalar(Math.random() * 0.5 + 0.1);
                temp.updateMatrix();
                dustRef.current.setMatrixAt(i, temp.matrix);
            }
            dustRef.current.instanceMatrix.needsUpdate = true;
        }
    }, []);

    // 🌈 🎨 GOLD MASTER: Peach -> Dark Red (Organic Gradient)
    const { skyGeo, skyMat } = useMemo(() => {
        const geo = getGeometryPool().getSphereGeometry(600, 32, 32);
        const mat = new ShaderMaterial({
            uniforms: {
                topColor: { value: new Color('#2a0505') },    // 🩸 Dark blood red (Top)
                bottomColor: { value: new Color('#200a14') }, // 🩸 Very dark maroon
                offset: { value: 28 },
                exponent: { value: 0.5 },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                    vWorldPosition = worldPosition.xyz;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float time;
                varying vec3 vWorldPosition;
                varying vec2 vUv;

                void main() {
                    float h = normalize( vWorldPosition ).y * 0.5 + 0.5; // FIXED MATH: Correct vertical gradient
                    vec3 gradient = mix( bottomColor, topColor, pow( h, exponent ) );

                    // 🕸️ HALFTONE PATTERN (Subtle Texture)
                    // Scale UVs for dots
                    vec2 uv = vUv * 80.0; 
                    
                    // Animate/Scroll UVs slightly
                    uv.y += time * 0.05;

                    vec2 grid = fract(uv) - 0.5;
                    float dist = length(grid);
                    float dot = smoothstep(0.3, 0.25, dist);

                    // Overlay dots (white, VERY low opacity)
                    vec3 finalColor = mix(gradient, vec3(1.0), dot * 0.02); // 0.02 instead of 0.05 (cleaner)

                    gl_FragColor = vec4( finalColor, 1.0 );
                }
            `,
            side: BackSide, // Inside the sphere
            depthWrite: false
        });
        return { skyGeo: geo, skyMat: mat };
    }, []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(erythrocyteGeo);
            getGeometryPool().release(dustGeo);
            safeDispose(erythrocyteMat);
            safeDispose(dustMat);
            getGeometryPool().release(skyGeo);
            safeDispose(skyMat);
        };
    }, [erythrocyteGeo, dustGeo, erythrocyteMat, dustMat, skyGeo, skyMat]);

    useEffect(() => {
        const callback = (_delta: number, time: number) => {
            // Update time for scrolling skybox
            if (skyMat.uniforms && skyMat.uniforms.time) {
                skyMat.uniforms.time.value = time;
            }

            // Эритроциты медленно вращаются и движутся
            if (erythrocytesRef.current) {
                erythrocytesRef.current.rotation.y = time * 0.03;
                erythrocytesRef.current.position.z = (time * 8) % 100;
            }

            // Пыль быстро летит навстречу
            if (dustRef.current) {
                dustRef.current.position.z = (time * 80) % 300;
            }
        };
        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [skyMat]);

    return (
        <group name="atmosphere">
            <mesh ref={skyRef} geometry={skyGeo} material={skyMat} renderOrder={-3} />

            {/* Плавающие эритроциты */}
            <instancedMesh ref={erythrocytesRef} args={[erythrocyteGeo, erythrocyteMat, 40]} />

            {/* Пылинки для ощущения скорости */}
            <instancedMesh ref={dustRef} args={[dustGeo, dustMat, 25]} />

            {/* 🧬 🎨 VQC: Спирали ДНК на фоне (RESTORED with Z-sorting) */}
            <DNABackground />
        </group>
    );
};

export default Atmosphere;
