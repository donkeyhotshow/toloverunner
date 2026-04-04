
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { LOD_CONFIG } from '../../constants';
import { CurveHelper } from '../utils/CurveHelper';
import { scheduleMatrixUpdate } from '../../components/System/InstanceUpdateScheduler';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';

// Configuration
/** Размер одного сегмента трека в единицах мира */
export const CHUNK_SIZE = 20;
const ROAD_THICKNESS = 1.0;

/**
 * Система управления визуализацией бесконечного трека
 *
 * Использует instanced mesh для эффективного рендеринга множества сегментов.
 * Реализует бесконечную прокрутку через модульную арифметику и применяет
 * кривизну трека через CurveHelper.
 *
 * @example
 * ```typescript
 * const trackSystem = new TrackSystem();
 * trackSystem.registerMesh(instancedMesh);
 *
 * // В игровом цикле
 * trackSystem.update(totalDistance);
 * ```
 */
export class TrackSystem {
    // The visual mesh references
    private meshes: THREE.InstancedMesh[] = [];

    // Reusable objects for matrix calculations
    // Reusable objects for matrix calculations
    private _dummy = new THREE.Object3D();
    private lastUpdateTime = 0;

    /**
     * Регистрирует instanced mesh для рендеринга трека
     * @param mesh Instanced mesh для сегментов трека
     */
    registerMesh(mesh: THREE.InstancedMesh) {
        if (!this.meshes.includes(mesh)) {
            this.meshes.push(mesh);
            mesh.count = LOD_CONFIG.TRACK_CHUNKS;
            this.update(0);
        }
    }

    /**
     * Удаляет instanced mesh из системы
     */
    unregisterMesh(mesh: THREE.InstancedMesh) {
        const index = this.meshes.indexOf(mesh);
        if (index !== -1) {
            this.meshes.splice(index, 1);
        }
    }

    /**
     * Сбрасывает трек в начальное состояние
     */
    reset() {
        this.update(0);
    }

    /**
     * Обновляет позиции и трансформации сегментов трека
     *
     * Выполняет:
     * 1. Бесконечную прокрутку через модульную арифметику
     * 2. Применение кривизны через CurveHelper
     * 3. Обновление матриц инстансов
     *
     * @param totalDistance Общая пройденная дистанция игрока
     */
    update(totalDistance: number) {
        if (this.meshes.length === 0) return;

        // 🔧 P0: THROTTLE - Limit updates to ~60Hz (16ms)
        const now = performance.now();
        if (now - this.lastUpdateTime < 16) return;
        this.lastUpdateTime = now;

        const perfSettings = getPerformanceManager().getQualitySettings();
        const chunkCount = perfSettings.trackChunks;
        const totalTrackLength = CHUNK_SIZE * chunkCount;
        
        // --- DETERMINISTIC GRID SNAPPING ---
        // 🎯 SPEC: Snap to 0.0001 units to eliminate micro-gaps due to float jitter
        const GRID_SNAP = 0.0001;
        const snappedDistance = Math.round((totalDistance % totalTrackLength) / GRID_SNAP) * GRID_SNAP;
        
        const startZ = -totalTrackLength * 0.25;
        const dummy = this._dummy;
        const halfThickness = -ROAD_THICKNESS / 2;

        for (let i = 0; i < chunkCount; i++) {
            // 1. Infinite Scrolling Z - Absolute alignment
            const relativeZ = startZ + (i * CHUNK_SIZE) + snappedDistance;
            let normalizedZ = ((relativeZ - startZ) % totalTrackLength + totalTrackLength) % totalTrackLength + startZ;

            // 2. Get Curve Data
            const curve = CurveHelper.getCurveAt(normalizedZ);

            // 3. Update Matrix (inline for speed)
            // Micro Y-offset based on index to reduce Z-fighting
            const yOffset = i * 0.0001; 
            
            dummy.position.set(curve.x, halfThickness + yOffset, normalizedZ);
            dummy.rotation.set(0, curve.rotY, 0);
            dummy.scale.set(1, 1, 1); // FIXED: Removed 1.02 stretch, using precise overlapping or just exact fit
            dummy.updateMatrix();

            const meshCount = this.meshes.length;
            for (let j = 0; j < meshCount; j++) {
                const mesh = this.meshes[j];
                if (mesh) {
                    // Safety check for dynamic chunk count
                    if (i < mesh.instanceMatrix.count) {
                        mesh.setMatrixAt(i, dummy.matrix);
                    }
                }
            }
        }

        const meshCount = this.meshes.length;
        for (let i = 0; i < meshCount; i++) {
            scheduleMatrixUpdate(this.meshes[i]);
        }
    }

    /**
     * Освобождает ресурсы системы
     * Должен вызываться при размонтировании компонента
     */
    dispose() {
        this.meshes = [];
    }
}
