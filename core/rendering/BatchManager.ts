/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BatchManager - Система батчинга для оптимизации draw calls
 *
 * Объединяет множественные мелкие объекты в единые InstancedMesh для драматического
 * снижения draw calls с ~200+ до <20, что критично для достижения 60 FPS.
 */

import * as THREE from 'three';
import { debugLog, debugWarn } from '../../utils/debug';
import { scheduleMatrixUpdate } from '../../components/System/InstanceUpdateScheduler';

export interface BatchConfig {
    maxInstances: number;
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    frustumCulled?: boolean;
    castShadow?: boolean;
    receiveShadow?: boolean;
}

/** userData хранит slotIndex и опционально другие поля от вызывающего кода */
export interface BatchInstanceUserData {
    slotIndex?: number;
    [key: string]: unknown;
}

export interface BatchInstance {
    id: string;
    matrix: THREE.Matrix4;
    visible: boolean;
    userData?: BatchInstanceUserData;
}

export class BatchManager {
    private batches: Map<string, THREE.InstancedMesh> = new Map();
    private batchConfigs: Map<string, BatchConfig> = new Map();
    private instances: Map<string, Map<string, BatchInstance>> = new Map();
    private availableSlots: Map<string, number[]> = new Map();
    private scene: THREE.Scene | null = null;

    // Performance tracking
    private totalDrawCallsSaved: number = 0;
    private batchUpdateCount: number = 0;

    constructor(scene?: THREE.Scene) {
        if (scene) {
            this.scene = scene;
        }
    }

    /**
     * Установить сцену для автоматического добавления батчей
     */
    setScene(scene: THREE.Scene): void {
        this.scene = scene;
    }

    /**
     * Создать новый батч
     */
    createBatch(batchId: string, config: BatchConfig): THREE.InstancedMesh {
        if (this.batches.has(batchId)) {
            debugWarn(`Batch "${batchId}" already exists`);
            return this.batches.get(batchId)!;
        }

        // Создаем InstancedMesh
        const batch = new THREE.InstancedMesh(
            config.geometry,
            config.material,
            config.maxInstances
        );

        // Настройки
        batch.frustumCulled = config.frustumCulled ?? true;
        batch.castShadow = config.castShadow ?? false;
        batch.receiveShadow = config.receiveShadow ?? false;

        // Инициализируем все инстансы как невидимые
        const dummyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < config.maxInstances; i++) {
            batch.setMatrixAt(i, dummyMatrix);
        }
        scheduleMatrixUpdate(batch);

        // Сохраняем
        this.batches.set(batchId, batch);
        this.batchConfigs.set(batchId, config);
        this.instances.set(batchId, new Map());
        this.availableSlots.set(batchId, Array.from({ length: config.maxInstances }, (_, i) => i));

        // Добавляем в сцену если она установлена
        if (this.scene) {
            this.scene.add(batch);
        }

        debugLog(`🎨 BatchManager: Created batch "${batchId}" with ${config.maxInstances} instances`);
        return batch;
    }

    /**
     * Добавить инстанс в батч
     */
    addInstance(batchId: string, instanceId: string, matrix: THREE.Matrix4, userData?: unknown): boolean {
        const batch = this.batches.get(batchId);
        const instances = this.instances.get(batchId);
        const availableSlots = this.availableSlots.get(batchId);

        if (!batch || !instances || !availableSlots) {
            debugWarn(`Batch "${batchId}" not found`);
            return false;
        }

        if (instances.has(instanceId)) {
            debugWarn(`Instance "${instanceId}" already exists in batch "${batchId}"`);
            return false;
        }

        if (availableSlots.length === 0) {
            debugWarn(`Batch "${batchId}" is full`);
            return false;
        }

        // Получаем свободный слот
        const slotIndex = availableSlots.pop()!;

        const baseUserData: Record<string, unknown> =
            typeof userData === 'object' && userData !== null && !Array.isArray(userData)
                ? (userData as Record<string, unknown>)
                : {};

        // Создаем инстанс
        const instance: BatchInstance = {
            id: instanceId,
            matrix: matrix.clone(),
            visible: true,
            userData: { ...baseUserData, slotIndex }
        };

        // Устанавливаем матрицу в батч
        batch.setMatrixAt(slotIndex, matrix);
        scheduleMatrixUpdate(batch);

        // Сохраняем инстанс с индексом слота
        instances.set(instanceId, instance);

        this.batchUpdateCount++;
        return true;
    }

    /**
     * Обновить инстанс в батче
     */
    updateInstance(batchId: string, instanceId: string, matrix: THREE.Matrix4): boolean {
        const batch = this.batches.get(batchId);
        const instances = this.instances.get(batchId);

        if (!batch || !instances) {
            return false;
        }

        const instance = instances.get(instanceId);
        if (!instance) {
            return false;
        }

        const slotIndex = instance.userData?.slotIndex;
        if (slotIndex === undefined) {
            return false;
        }

        // Обновляем матрицу
        instance.matrix.copy(matrix);
        batch.setMatrixAt(slotIndex, matrix);
        scheduleMatrixUpdate(batch);

        this.batchUpdateCount++;
        return true;
    }

    /**
     * Удалить инстанс из батча
     */
    removeInstance(batchId: string, instanceId: string): boolean {
        const batch = this.batches.get(batchId);
        const instances = this.instances.get(batchId);
        const availableSlots = this.availableSlots.get(batchId);

        if (!batch || !instances || !availableSlots) {
            return false;
        }

        const instance = instances.get(instanceId);
        if (!instance) {
            return false;
        }

        const slotIndex = instance.userData?.slotIndex;
        if (slotIndex === undefined) {
            return false;
        }

        // Скрываем инстанс (масштаб в 0)
        const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        batch.setMatrixAt(slotIndex, hiddenMatrix);
        scheduleMatrixUpdate(batch);

        // Возвращаем слот в доступные
        availableSlots.push(slotIndex);
        instances.delete(instanceId);

        this.batchUpdateCount++;
        return true;
    }

    /**
     * Показать/скрыть инстанс
     */
    setInstanceVisible(batchId: string, instanceId: string, visible: boolean): boolean {
        const batch = this.batches.get(batchId);
        const instances = this.instances.get(batchId);

        if (!batch || !instances) {
            return false;
        }

        const instance = instances.get(instanceId);
        if (!instance) {
            return false;
        }

        const slotIndex = instance.userData?.slotIndex;
        if (slotIndex === undefined) {
            return false;
        }

        instance.visible = visible;

        if (visible) {
            batch.setMatrixAt(slotIndex, instance.matrix);
        } else {
            const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
            batch.setMatrixAt(slotIndex, hiddenMatrix);
        }

        scheduleMatrixUpdate(batch);
        this.batchUpdateCount++;
        return true;
    }

    /**
     * Получить батч
     */
    getBatch(batchId: string): THREE.InstancedMesh | undefined {
        return this.batches.get(batchId);
    }

    /**
     * Получить все инстансы батча
     */
    getBatchInstances(batchId: string): Map<string, BatchInstance> | undefined {
        return this.instances.get(batchId);
    }

    /**
     * Получить количество активных инстансов в батче
     */
    getActiveInstanceCount(batchId: string): number {
        const instances = this.instances.get(batchId);
        if (!instances) return 0;

        return Array.from(instances.values()).filter(instance => instance.visible).length;
    }

    /**
     * Получить статистику использования батча
     */
    getBatchStats(batchId: string): {
        maxInstances: number;
        activeInstances: number;
        availableSlots: number;
        utilization: number;
    } | null {
        const config = this.batchConfigs.get(batchId);
        const instances = this.instances.get(batchId);
        const availableSlots = this.availableSlots.get(batchId);

        if (!config || !instances || !availableSlots) {
            return null;
        }

        const activeInstances = this.getActiveInstanceCount(batchId);

        return {
            maxInstances: config.maxInstances,
            activeInstances,
            availableSlots: availableSlots.length,
            utilization: (activeInstances / config.maxInstances) * 100
        };
    }

    /**
     * Оптимизировать батч (дефрагментация)
     */
    optimizeBatch(batchId: string): void {
        const batch = this.batches.get(batchId);
        const instances = this.instances.get(batchId);
        const availableSlots = this.availableSlots.get(batchId);
        const config = this.batchConfigs.get(batchId);

        if (!batch || !instances || !availableSlots || !config) {
            return;
        }

        // Собираем все активные инстансы
        const activeInstances = Array.from(instances.entries())
            .filter(([_, instance]) => instance.visible);

        // Очищаем батч
        const hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        for (let i = 0; i < config.maxInstances; i++) {
            batch.setMatrixAt(i, hiddenMatrix);
        }

        // Переразмещаем инстансы компактно
        instances.clear();
        availableSlots.length = 0;

        activeInstances.forEach(([instanceId, instance], index) => {
            batch.setMatrixAt(index, instance.matrix);
            const prev = instance.userData;
            const base = prev && typeof prev === 'object' ? prev : {};
            instance.userData = { ...base, slotIndex: index };
            instances.set(instanceId, instance);
        });

        // Заполняем доступные слоты
        for (let i = activeInstances.length; i < config.maxInstances; i++) {
            availableSlots.push(i);
        }

        scheduleMatrixUpdate(batch);
        debugLog(`🔧 BatchManager: Optimized batch "${batchId}" - ${activeInstances.length} active instances`);
    }

    /**
     * Обновить все батчи (вызывать в игровом цикле)
     */
    updateBatches(): void {
        // Периодическая оптимизация батчей
        if (this.batchUpdateCount > 1000) {
            this.batches.forEach((_, batchId) => {
                const stats = this.getBatchStats(batchId);
                if (stats && stats.utilization < 50 && stats.availableSlots > stats.activeInstances) {
                    this.optimizeBatch(batchId);
                }
            });
            this.batchUpdateCount = 0;
        }
    }

    /**
     * Удалить батч
     */
    removeBatch(batchId: string): void {
        const batch = this.batches.get(batchId);
        if (batch) {
            // Удаляем из сцены
            if (this.scene) {
                this.scene.remove(batch);
            }

            // Очищаем ресурсы
            batch.geometry.dispose();
            if (Array.isArray(batch.material)) {
                batch.material.forEach(mat => mat.dispose());
            } else {
                batch.material.dispose();
            }

            // Удаляем из карт
            this.batches.delete(batchId);
            this.batchConfigs.delete(batchId);
            this.instances.delete(batchId);
            this.availableSlots.delete(batchId);

            debugLog(`🗑️ BatchManager: Removed batch "${batchId}"`);
        }
    }

    /**
     * Очистить все батчи
     */
    clearAll(): void {
        this.batches.forEach((_, batchId) => {
            this.removeBatch(batchId);
        });

        this.totalDrawCallsSaved = 0;
        this.batchUpdateCount = 0;

        debugLog('🧹 BatchManager: Cleared all batches');
    }

    /**
     * Получить общую статистику
     */
    getOverallStats(): {
        totalBatches: number;
        totalInstances: number;
        totalDrawCallsSaved: number;
        averageUtilization: number;
    } {
        let totalInstances = 0;
        let totalUtilization = 0;
        let batchCount = 0;

        this.batches.forEach((_, batchId) => {
            const stats = this.getBatchStats(batchId);
            if (stats) {
                totalInstances += stats.activeInstances;
                totalUtilization += stats.utilization;
                batchCount++;
            }
        });

        // Примерный расчет сэкономленных draw calls
        // Без батчинга каждый инстанс = 1 draw call
        // С батчингом каждый батч = 1 draw call
        this.totalDrawCallsSaved = Math.max(0, totalInstances - batchCount);

        return {
            totalBatches: batchCount,
            totalInstances,
            totalDrawCallsSaved: this.totalDrawCallsSaved,
            averageUtilization: batchCount > 0 ? totalUtilization / batchCount : 0
        };
    }

    /**
     * Получить отладочную информацию
     */
    getDebugInfo(): string {
        const stats = this.getOverallStats();
        const lines = [
            `Batches: ${stats.totalBatches}`,
            `Instances: ${stats.totalInstances}`,
            `Draw Calls Saved: ${stats.totalDrawCallsSaved}`,
            `Avg Utilization: ${stats.averageUtilization.toFixed(1)}%`
        ];

        this.batches.forEach((_, batchId) => {
            const batchStats = this.getBatchStats(batchId);
            if (batchStats) {
                lines.push(`  ${batchId}: ${batchStats.activeInstances}/${batchStats.maxInstances} (${batchStats.utilization.toFixed(1)}%)`);
            }
        });

        return lines.join('\n');
    }
}

// Предустановленные конфигурации для типичных объектов игры
export const createVirusBatchConfig = (maxInstances: number = 100): BatchConfig => ({
    maxInstances,
    geometry: new THREE.SphereGeometry(0.5, 8, 6), // Низкополигональная сфера для вирусов
    material: new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8
    }),
    frustumCulled: true,
    castShadow: false,
    receiveShadow: false
});

export const createSlimeBatchConfig = (maxInstances: number = 50): BatchConfig => ({
    maxInstances,
    geometry: new THREE.BoxGeometry(1, 0.3, 0.5), // Плоский бокс для слизи
    material: new THREE.MeshStandardMaterial({
        color: 0x8000ff,
        transparent: true,
        opacity: 0.6
    }),
    frustumCulled: true,
    castShadow: false,
    receiveShadow: false
});

export const createParticleBatchConfig = (maxInstances: number = 200): BatchConfig => ({
    maxInstances,
    geometry: new THREE.PlaneGeometry(0.1, 0.1), // Мелкие частицы
    material: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    }),
    frustumCulled: false, // Частицы могут быть везде
    castShadow: false,
    receiveShadow: false
});

// Синглтон для глобального доступа
let batchManagerInstance: BatchManager | null = null;

export const getBatchManager = (): BatchManager => {
    if (!batchManagerInstance) {
        batchManagerInstance = new BatchManager();
    }
    return batchManagerInstance;
};

export const destroyBatchManager = (): void => {
    if (batchManagerInstance) {
        batchManagerInstance.clearAll();
        batchManagerInstance = null;
    }
};
