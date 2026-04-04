/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Geometry Pool - Переиспользование геометрий
 * Предотвращает создание дубликатов одинаковых геометрий
 */

import * as THREE from 'three';
import { getPerformanceManager } from '../performance/PerformanceManager';
import { debugLog } from '../../utils/debug';


/**
 * Пул геометрий для переиспользования с улучшенным управлением памятью
 */
export class GeometryPool {
    private static instance: GeometryPool;
    private pool: Map<string, THREE.BufferGeometry> = new Map();
    private refCounts: Map<string, number> = new Map();
    private lastUsed: Map<string, number> = new Map();
    private maxPoolSize = 100; // Максимальное количество геометрий в пуле
    private cleanupInterval = 60000; // Очистка каждую минуту
    private maxUnusedTime = 300000; // 5 минут без использования
    private cleanupIntervalId: number | null = null;

    private constructor() {
        // Запускаем периодическую очистку
        this.cleanupIntervalId = window.setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    static getInstance(): GeometryPool {
        if (!GeometryPool.instance) {
            GeometryPool.instance = new GeometryPool();
        }
        return GeometryPool.instance;
    }

    /**
     * Создать ключ для геометрии
     */
    private createKey(type: string, params: unknown[]): string {
        return `${type}_${params.join('_')}`;
    }

    /**
     * Получить или создать Box геометрию
     */
    getBoxGeometry(width: number, height: number, depth: number, widthSegments = 1, heightSegments = 1, depthSegments = 1): THREE.BoxGeometry {
        const key = this.createKey('box', [width, height, depth, widthSegments, heightSegments, depthSegments]);

        if (!this.pool.has(key)) {
            // Проверяем лимит пула
            if (this.pool.size >= this.maxPoolSize) {
                this.forceCleanup();
            }

            const geo = new THREE.BoxGeometry(width, height, depth, widthSegments, heightSegments, depthSegments);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        this.lastUsed.set(key, Date.now());
        return this.pool.get(key) as THREE.BoxGeometry;
    }

    /**
     * Получить или создать Sphere геометрию
     */
    getSphereGeometry(radius: number, widthSegments = 32, heightSegments = 16): THREE.SphereGeometry {
        const mult = getPerformanceManager().getQualitySettings().segmentsMultiplier;
        const ws = Math.max(8, Math.round(widthSegments * mult));
        const hs = Math.max(6, Math.round(heightSegments * mult));

        const key = this.createKey('sphere', [radius, ws, hs]);

        if (!this.pool.has(key)) {
            const geo = new THREE.SphereGeometry(radius, ws, hs);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        this.lastUsed.set(key, Date.now());
        return this.pool.get(key) as THREE.SphereGeometry;
    }

    /**
     * Получить или создать Cylinder геометрию
     */
    getCylinderGeometry(
        radiusTop: number,
        radiusBottom: number,
        height: number,
        radialSegments = 8,
        heightSegments = 1,
        openEnded = false
    ): THREE.CylinderGeometry {
        const mult = getPerformanceManager().getQualitySettings().segmentsMultiplier;
        const rs = Math.max(3, Math.round(radialSegments * mult));

        const key = this.createKey('cylinder', [radiusTop, radiusBottom, height, rs, heightSegments, openEnded ? 1 : 0]);

        if (!this.pool.has(key)) {
            const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, rs, heightSegments, openEnded);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.CylinderGeometry;
    }

    /**
     * Получить или создать Plane геометрию
     */
    getPlaneGeometry(width: number, height: number, widthSegments = 1, heightSegments = 1): THREE.PlaneGeometry {
        const key = this.createKey('plane', [width, height, widthSegments, heightSegments]);

        if (!this.pool.has(key)) {
            const geo = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.PlaneGeometry;
    }

    /**
     * Получить или создать Circle геометрию
     */
    getCircleGeometry(radius: number, segments = 32): THREE.CircleGeometry {
        const mult = getPerformanceManager().getQualitySettings().segmentsMultiplier;
        const s = Math.max(6, Math.round(segments * mult));

        const key = this.createKey('circle', [radius, s]);

        if (!this.pool.has(key)) {
            const geo = new THREE.CircleGeometry(radius, s);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.CircleGeometry;
    }

    /**
     * Получить или создать Torus геометрию
     */
    getTorusGeometry(radius: number, tube: number, radialSegments = 8, tubularSegments = 6, arc = Math.PI * 2): THREE.TorusGeometry {
        const mult = getPerformanceManager().getQualitySettings().segmentsMultiplier;
        const rs = Math.max(4, Math.round(radialSegments * mult));
        const ts = Math.max(4, Math.round(tubularSegments * mult));

        const key = this.createKey('torus', [radius, tube, rs, ts, arc.toFixed(4)]);

        if (!this.pool.has(key)) {
            const geo = new THREE.TorusGeometry(radius, tube, rs, ts, arc);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.TorusGeometry;
    }

    /**
     * Получить или создать Octahedron геометрию
     */
    getOctahedronGeometry(radius: number, detail = 0): THREE.OctahedronGeometry {
        const key = this.createKey('octa', [radius, detail]);

        if (!this.pool.has(key)) {
            const geo = new THREE.OctahedronGeometry(radius, detail);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.OctahedronGeometry;
    }

    /**
     * Получить или создать Icosahedron геометрию
     */
    getIcosahedronGeometry(radius: number, detail = 0): THREE.IcosahedronGeometry {
        const key = this.createKey('icosa', [radius, detail]);

        if (!this.pool.has(key)) {
            const geo = new THREE.IcosahedronGeometry(radius, detail);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.IcosahedronGeometry;
    }

    /**
     * Получить или создать Dodecahedron геометрию
     */
    getDodecahedronGeometry(radius: number, detail = 0): THREE.DodecahedronGeometry {
        const key = this.createKey('dodeca', [radius, detail]);

        if (!this.pool.has(key)) {
            const geo = new THREE.DodecahedronGeometry(radius, detail);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.DodecahedronGeometry;
    }

    /**
     * Получить или создать Cone геометрию
     */
    getConeGeometry(radius: number, height: number, radialSegments = 8, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2): THREE.ConeGeometry {
        const mult = getPerformanceManager().getQualitySettings().segmentsMultiplier;
        const rs = Math.max(3, Math.round(radialSegments * mult));

        const key = this.createKey('cone', [radius, height, rs, heightSegments, openEnded ? 1 : 0, thetaStart.toFixed(4), thetaLength.toFixed(4)]);

        if (!this.pool.has(key)) {
            const geo = new THREE.ConeGeometry(radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
            this.pool.set(key, geo);
            this.refCounts.set(key, 0);
        }

        this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1);
        return this.pool.get(key) as THREE.ConeGeometry;
    }


    /**
     * Освободить геометрию (уменьшить счётчик ссылок)
     */
    release(geometry: THREE.BufferGeometry): void {
        for (const [key, geo] of this.pool.entries()) {
            if (geo === geometry) {
                const count = this.refCounts.get(key) || 0;
                if (count > 0) {
                    this.refCounts.set(key, count - 1);
                }

                // Если больше никто не использует - удаляем
                if (count - 1 <= 0) {
                    geo.dispose();
                    this.pool.delete(key);
                    this.refCounts.delete(key);
                }
                break;
            }
        }
    }

    /**
     * Получить статистику пула
     */
    getStats(): { totalGeometries: number; types: Record<string, number>; memoryUsage: number } {
        const types: Record<string, number> = {};

        for (const key of this.pool.keys()) {
            const parts = key.split('_');
            const type = parts[0] ?? 'unknown';
            types[type] = (types[type] || 0) + 1;
        }

        return {
            totalGeometries: this.pool.size,
            types,
            memoryUsage: this.pool.size * 0.1 // Примерная оценка в MB
        };
    }

    /**
     * Периодическая очистка неиспользуемых геометрий
     */
    private cleanup(): void {
        const now = Date.now();
        const toRemove: string[] = [];

        for (const [key, lastUsedTime] of this.lastUsed.entries()) {
            const refCount = this.refCounts.get(key) || 0;

            // Удаляем геометрии, которые не использовались долго и имеют 0 ссылок
            if (refCount === 0 && (now - lastUsedTime) > this.maxUnusedTime) {
                toRemove.push(key);
            }
        }

        if (toRemove.length > 0) {
            debugLog(`GeometryPool: Cleaning up ${toRemove.length} unused geometries`);

            toRemove.forEach(key => {
                const geo = this.pool.get(key);
                if (geo) {
                    geo.dispose();
                    this.pool.delete(key);
                    this.refCounts.delete(key);
                    this.lastUsed.delete(key);
                }
            });
        }
    }

    /**
     * Принудительная очистка для освобождения места
     */
    private forceCleanup(): void {
        const toRemove: string[] = [];

        // Удаляем геометрии с нулевыми ссылками
        for (const [key, refCount] of this.refCounts.entries()) {
            if (refCount === 0) {
                toRemove.push(key);
            }
        }

        if (toRemove.length > 0) {
            debugLog(`GeometryPool: Force cleanup of ${toRemove.length} geometries`);

            toRemove.forEach(key => {
                const geo = this.pool.get(key);
                if (geo) {
                    geo.dispose();
                    this.pool.delete(key);
                    this.refCounts.delete(key);
                    this.lastUsed.delete(key);
                }
            });
        }
    }

    /**
     * Очистить весь пул (осторожно!)
     */
    clear(): void {
        debugLog(`GeometryPool: Clearing all ${this.pool.size} geometries`);
        this.pool.forEach(geo => geo.dispose());
        this.pool.clear();
        this.refCounts.clear();
        this.lastUsed.clear();
    }

    /**
     * Остановить мониторинг и очистить ресурсы (CRITICAL FIX)
     */
    stop(): void {
        if (this.cleanupIntervalId !== null) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
        this.clear();
        debugLog('🛑 GeometryPool stopped and cleaned up');
    }
}

/**
 * Получить экземпляр пула геометрий
 */
export function getGeometryPool(): GeometryPool {
    return GeometryPool.getInstance();
}
