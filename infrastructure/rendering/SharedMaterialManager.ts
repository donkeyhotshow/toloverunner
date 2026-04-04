/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SharedMaterialManager - Централизованное управление материалами
 * Уменьшает количество материалов и draw calls путём переиспользования
 */

import * as THREE from 'three';
import { getPerformanceManager, QualityLevel } from '../performance/PerformanceManager';

/**
 * Типы материалов в игре
 */
export enum MaterialType {
    VIRUS_MAIN = 'virus_main',
    VIRUS_OUTLINE = 'virus_outline',
    ORB_MAIN = 'orb_main',
    ORB_SHADOW = 'orb_shadow',
    TRACK_MAIN = 'track_main',
    PLAYER_MAIN = 'player_main',
}

/**
 * Конфигурация материала
 */


/**
 * Менеджер общих материалов
 * Singleton для предотвращения дублирования
 */
class SharedMaterialManager {
    private static instance: SharedMaterialManager;
    private materials: Map<MaterialType, THREE.Material> = new Map();
    private currentQuality: QualityLevel = QualityLevel.MEDIUM;

    private constructor() {
        this.currentQuality = getPerformanceManager().getCurrentQuality();
        this.initializeMaterials();
    }

    static getInstance(): SharedMaterialManager {
        if (!SharedMaterialManager.instance) {
            SharedMaterialManager.instance = new SharedMaterialManager();
        }
        return SharedMaterialManager.instance;
    }

    /**
     * Инициализация всех материалов
     */
    private initializeMaterials(): void {
        // Note: Using getPerformanceManager() directly in material creation for quality settings
        const isLow = this.currentQuality === QualityLevel.LOW;
        const isHigh = this.currentQuality === QualityLevel.HIGH || this.currentQuality === QualityLevel.ULTRA;

        // Virus материалы
        const VirusMaterialClass = isHigh ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
        const virusMain = new VirusMaterialClass({
            color: '#ffffff',
            transparent: true,
            alphaTest: 0.1,
            emissive: '#ffffff',
            emissiveIntensity: isHigh ? 0.2 : 0.1,
            vertexColors: true
        });

        if (isHigh && virusMain instanceof THREE.MeshStandardMaterial) {
            virusMain.roughness = 0.4;
            virusMain.metalness = 0.3;
        }

        this.materials.set(MaterialType.VIRUS_MAIN, virusMain);

        // Virus outline
        if (!isLow) {
            const virusOutline = new THREE.MeshLambertMaterial({
                color: '#000000',
                side: THREE.BackSide,
                transparent: true,
                opacity: 0.2,
                depthWrite: false,
            });
            this.materials.set(MaterialType.VIRUS_OUTLINE, virusOutline);
        }

        // Orb материалы
        const OrbMaterialClass = isHigh ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
        const orbMain = new OrbMaterialClass({
            color: '#ffffff',
            transparent: true,
            opacity: 0.9,
            emissive: '#ffffff',
            emissiveIntensity: isHigh ? 0.4 : 0.3,
            vertexColors: true
        });

        if (isHigh && orbMain instanceof THREE.MeshStandardMaterial) {
            orbMain.roughness = 0.1;
            orbMain.metalness = 0.8;
        }

        this.materials.set(MaterialType.ORB_MAIN, orbMain);

        // Orb shadow
        if (!isLow) {
            const orbShadow = new THREE.MeshBasicMaterial({
                color: '#000000',
                transparent: true,
                opacity: 0.15,
                depthWrite: false
            });
            this.materials.set(MaterialType.ORB_SHADOW, orbShadow);
        }

        // Track материал - ПЕРЕКЛЮЧАЕМ НА MeshBasicMaterial НА LOW ДЛЯ FPS
        const TrackMaterialClass = isLow ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
        const trackMat = new TrackMaterialClass({
            color: '#ffffff',
            vertexColors: false
        });
        this.materials.set(MaterialType.TRACK_MAIN, trackMat);

        // Player материал
        const PlayerMaterialClass = isHigh ? THREE.MeshStandardMaterial : THREE.MeshLambertMaterial;
        const playerMain = new PlayerMaterialClass({
            color: '#ffffff',
            vertexColors: true,
            emissive: '#ffffff',
            emissiveIntensity: isHigh ? 0.3 : 0.2
        });

        if (isHigh && playerMain instanceof THREE.MeshStandardMaterial) {
            playerMain.roughness = 0.3;
            playerMain.metalness = 0.5;
        }

        this.materials.set(MaterialType.PLAYER_MAIN, playerMain);
    }

    /**
     * Получить материал по типу
     */
    getMaterial(type: MaterialType): THREE.Material | null {
        return this.materials.get(type) || null;
    }

    /**
     * Установить текстуру для материала
     */
    setTexture(type: MaterialType, texture: THREE.Texture | null): void {
        const mat = this.materials.get(type);
        if (mat && 'map' in mat) {
            const settings = getPerformanceManager().getQualitySettings();
            
            if (texture) {
                // ПРИМЕНЯЕМ НАСТРОЙКИ КАЧЕСТВА ТЕКСТУРЫ
                texture.anisotropy = settings.textureQuality > 1.0 ? 16 : (settings.textureQuality >= 1.0 ? 8 : 2);
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
            }

            (mat as any).map = texture;
            mat.needsUpdate = true;
        }
    }

    /**
     * Обновить качество и пересоздать материалы если нужно
     */
    updateQuality(quality: QualityLevel): void {
        if (this.currentQuality === quality) return;

        this.currentQuality = quality;
        this.dispose();
        this.materials.clear();
        this.initializeMaterials();
    }

    /**
     * Очистить все материалы
     */
    dispose(): void {
        this.materials.forEach(mat => mat.dispose());
        this.materials.clear();
    }

    /**
     * Получить статистику материалов
     */
    getStats(): { totalMaterials: number; types: string[] } {
        return {
            totalMaterials: this.materials.size,
            types: Array.from(this.materials.keys())
        };
    }
}

/**
 * Получить экземпляр менеджера материалов
 */
export function getSharedMaterialManager(): SharedMaterialManager {
    return SharedMaterialManager.getInstance();
}
