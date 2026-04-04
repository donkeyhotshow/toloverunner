/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ResourceCleanupManager - Автоматичне очищення невикористовуваних ресурсів
 * при переході між рівнями для запобігання витоків пам'яті
 */

import * as THREE from 'three';

export interface CleanupStats {
    texturesCleaned: number;
    geometriesCleaned: number;
    materialsCleaned: number;
    meshesCleaned: number;
    totalMemoryFreed: number; // bytes
}

export interface CleanupConfig {
    /** Чи очищувати текстури */
    cleanTextures: boolean;
    /** Чи очищувати геометрії */
    cleanGeometries: boolean;
    /** Чи очищувати матеріали */
    cleanMaterials: boolean;
    /** Максимальний вік текстури для очищення (ms) */
    maxTextureAge: number;
    /** Мінімальна кількість використань текстури перед видаленням */
    minTextureUsageCount: number;
}

const DEFAULT_CONFIG: CleanupConfig = {
    cleanTextures: true,
    cleanGeometries: true,
    cleanMaterials: true,
    maxTextureAge: 60000, // 1 хвилина
    minTextureUsageCount: 3,
};

/**
 * Відстежуваний ресурс
 */
interface TrackedResource<T> {
    resource: T;
    lastUsed: number;
    useCount: number;
    size: number;
}

export class ResourceCleanupManager {
    private config: CleanupConfig;
    private trackedTextures: Map<string, TrackedResource<THREE.Texture>> = new Map();
    private trackedGeometries: Map<string, TrackedResource<THREE.BufferGeometry>> = new Map();
    private trackedMaterials: Map<string, TrackedResource<THREE.Material>> = new Map();
    private levelStartTime: number = 0;
    private cleanupStats: CleanupStats = {
        texturesCleaned: 0,
        geometriesCleaned: 0,
        materialsCleaned: 0,
        meshesCleaned: 0,
        totalMemoryFreed: 0,
    };

    constructor(config: Partial<CleanupConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.levelStartTime = performance.now();
    }

    getLevelStartTime(): number {
        return this.levelStartTime;
    }

    /**
     * Почати новий рівень - скинути таймери
     */
    startNewLevel(): void {
        this.levelStartTime = performance.now();
        
        // Очистити статистику
        this.cleanupStats = {
            texturesCleaned: 0,
            geometriesCleaned: 0,
            materialsCleaned: 0,
            meshesCleaned: 0,
            totalMemoryFreed: 0,
        };
    }

    /**
     * Зареєструвати текстуру для відстеження
     */
    trackTexture(id: string, texture: THREE.Texture): void {
        const size = this.estimateTextureSize(texture);
        
        this.trackedTextures.set(id, {
            resource: texture,
            lastUsed: performance.now(),
            useCount: 0,
            size,
        });
    }

    /**
     * Зареєструвати геометрію для відстеження
     */
    trackGeometry(id: string, geometry: THREE.BufferGeometry): void {
        const size = this.estimateGeometrySize(geometry);
        
        this.trackedGeometries.set(id, {
            resource: geometry,
            lastUsed: performance.now(),
            useCount: 0,
            size,
        });
    }

    /**
     * Зареєструвати матеріал для відстеження
     */
    trackMaterial(id: string, material: THREE.Material): void {
        const size = this.estimateMaterialSize(material);
        
        this.trackedMaterials.set(id, {
            resource: material,
            lastUsed: performance.now(),
            useCount: 0,
            size,
        });
    }

    /**
     * Позначити ресурс як використаний
     */
    markUsed(id: string, type: 'texture' | 'geometry' | 'material'): void {
        const map = this.getResourceMap(type);
        const tracked = map.get(id);
        
        if (tracked) {
            tracked.lastUsed = performance.now();
            tracked.useCount++;
        }
    }

    /**
     * Отримати мапу ресурсів за типом
     */
    private getResourceMap(type: 'texture' | 'geometry' | 'material'): Map<string, TrackedResource<unknown>> {
        switch (type) {
            case 'texture':
                return this.trackedTextures as Map<string, TrackedResource<unknown>>;
            case 'geometry':
                return this.trackedGeometries as Map<string, TrackedResource<unknown>>;
            case 'material':
                return this.trackedMaterials as Map<string, TrackedResource<unknown>>;
        }
    }

    /**
     * Виконати очищення невикористовуваних ресурсів
     */
    cleanup(): CleanupStats {
        const now = performance.now();
        const stats: CleanupStats = {
            texturesCleaned: 0,
            geometriesCleaned: 0,
            materialsCleaned: 0,
            meshesCleaned: 0,
            totalMemoryFreed: 0,
        };

        if (this.config.cleanTextures) {
            const textureStats = this.cleanupTextures(now);
            stats.texturesCleaned = textureStats.count;
            stats.totalMemoryFreed += textureStats.memory;
        }

        if (this.config.cleanGeometries) {
            const geometryStats = this.cleanupGeometries(now);
            stats.geometriesCleaned = geometryStats.count;
            stats.totalMemoryFreed += geometryStats.memory;
        }

        if (this.config.cleanMaterials) {
            const materialStats = this.cleanupMaterials(now);
            stats.materialsCleaned = materialStats.count;
            stats.totalMemoryFreed += materialStats.memory;
        }

        this.cleanupStats = stats;
        return stats;
    }

    /**
     * Очистити невикористовувані текстури
     */
    private cleanupTextures(now: number): { count: number; memory: number } {
        let count = 0;
        let memory = 0;

        for (const [id, tracked] of this.trackedTextures) {
            const age = now - tracked.lastUsed;
            
            // Видалити якщо: стара і мало використовувалась
            if (age > this.config.maxTextureAge && tracked.useCount < this.config.minTextureUsageCount) {
                tracked.resource.dispose();
                this.trackedTextures.delete(id);
                count++;
                memory += tracked.size;
            }
        }

        return { count, memory };
    }

    /**
     * Очистити невикористовувані геометрії
     */
    private cleanupGeometries(now: number): { count: number; memory: number } {
        let count = 0;
        let memory = 0;

        for (const [id, tracked] of this.trackedGeometries) {
            const age = now - tracked.lastUsed;
            
            if (age > this.config.maxTextureAge && tracked.useCount < this.config.minTextureUsageCount) {
                tracked.resource.dispose();
                this.trackedGeometries.delete(id);
                count++;
                memory += tracked.size;
            }
        }

        return { count, memory };
    }

    /**
     * Очистити невикористовувані матеріали
     */
    private cleanupMaterials(now: number): { count: number; memory: number } {
        let count = 0;
        let memory = 0;

        for (const [id, tracked] of this.trackedMaterials) {
            const age = now - tracked.lastUsed;
            
            if (age > this.config.maxTextureAge && tracked.useCount < this.config.minTextureUsageCount) {
                tracked.resource.dispose();
                this.trackedMaterials.delete(id);
                count++;
                memory += tracked.size;
            }
        }

        return { count, memory };
    }

    /**
     * Очистити всі ресурси
     */
    dispose(): void {
        for (const tracked of this.trackedTextures.values()) {
            tracked.resource.dispose();
        }
        this.trackedTextures.clear();

        for (const tracked of this.trackedGeometries.values()) {
            tracked.resource.dispose();
        }
        this.trackedGeometries.clear();

        for (const tracked of this.trackedMaterials.values()) {
            tracked.resource.dispose();
        }
        this.trackedMaterials.clear();
    }

    /**
     * Отримати статистику
     */
    getStats(): { tracked: { textures: number; geometries: number; materials: number }; lastCleanup: CleanupStats } {
        return {
            tracked: {
                textures: this.trackedTextures.size,
                geometries: this.trackedGeometries.size,
                materials: this.trackedMaterials.size,
            },
            lastCleanup: this.cleanupStats,
        };
    }

    /**
     * Оцінити розмір текстури
     */
    private estimateTextureSize(texture: THREE.Texture): number {
        const image = texture.image;
        if (!image) return 0;
        
        const width = image.width || 256;
        const height = image.height || 256;
        const bytesPerPixel = 4; // RGBA
        
        return width * height * bytesPerPixel;
    }

    /**
     * Оцінити розмір геометрії
     */
    private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
        let size = 0;
        
        const position = geometry.getAttribute('position');
        if (position) {
            size += position.count * 4 * position.itemSize; // 4 bytes per float
        }
        
        const normal = geometry.getAttribute('normal');
        if (normal) {
            size += normal.count * 4 * normal.itemSize;
        }
        
        const uv = geometry.getAttribute('uv');
        if (uv) {
            size += uv.count * 4 * uv.itemSize;
        }
        
        return size;
    }

    /**
     * Оцінити розмір матеріалу
     */
    private estimateMaterialSize(_material: THREE.Material): number {
        // Приблизний розмір матеріалу
        return 1024; 
    }
}

// Singleton instance
let resourceCleanupManager: ResourceCleanupManager | null = null;

/**
 * Отримати екземпляр ResourceCleanupManager
 */
export function getResourceCleanupManager(config?: Partial<CleanupConfig>): ResourceCleanupManager {
    if (!resourceCleanupManager) {
        resourceCleanupManager = new ResourceCleanupManager(config);
    }
    return resourceCleanupManager;
}

/**
 * Скинути екземпляр ResourceCleanupManager
 */
export function resetResourceCleanupManager(): void {
    if (resourceCleanupManager) {
        resourceCleanupManager.dispose();
        resourceCleanupManager = null;
    }
}