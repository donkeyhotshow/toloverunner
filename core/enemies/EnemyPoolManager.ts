/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Enemy Pool Manageализованная система управления врагами с object pooling
 * Решает проблемы:
 * - Отсутствие централизованного EnemyManager
 * - Враги разбросаны по отдельным файлам
 * - Нет object pooling для врагов
 * - GC паузы при массовом спавне
 * - Нет координации между типами врагов
 */

import * as THREE from 'three';

// Типы врагов
// Типи ворогів згідно з World Bible
export type EnemyType = 
    | 'GLOBUS_VULGARIS' | 'GLOBUS_IRRITATUS' | 'GLOBUS_MAXIMUS' | 'VERMIS_ELECTRICUS' | 'VERMIS_OSCILLANS'
    | 'COCCUS_SIMPLEX' | 'BACILLUS_MAGNUS' | 'STREPTOCOCCUS_CHAIN' | 'BACTERIUM_FELIX' | 'BACTERIUM_SPORE' | 'BACTERIUM_FLAGELLUM'
    | 'VIRUS_CORONA' | 'VIRUS_MOBILIS' | 'VIRUS_GIGANTUS' | 'VIRUS_INVISIBLE'
    | 'LEUKOCYTE_PATROL' | 'NEUTROPHIL_AGGRESSIVE' | 'MACROPHAGE_GIANT' | 'MAST_CELL'
    | 'MEMBRANA_SIMPLEX' | 'MEMBRANA_GLUTINOSA' | 'MEMBRANA_ROTANS' | 'MEMBRANA_OBSCURA';

// Поведение врагов
export type EnemyBehavior = 'static' | 'drifting' | 'patrolling' | 'chasing' | 'jumping';

// Состояние поведения
export interface EnemyBehaviorState {
    driftPhase?: number;
    patrolPoints?: THREE.Vector3[];
    patrolIndex?: number;
    jumpPhase?: number;
    baseY?: number;
    [key: string]: unknown; // Расширяемость; предпочтительно типизированные поля
}

// Состояние врага
export interface EnemyState {
    id: string;
    type: EnemyType;
    isActive: boolean;
    isVisible: boolean;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
    health: number;
    maxHealth: number;
    damage: number;
    behavior: EnemyBehavior;
    behaviorState: EnemyBehaviorState;
    lodLevel: number;
    animationSpeed: number;
    spawnTime: number;
    lastUpdateTime: number;
    collisionRadius: number;
    // Визуальные параметры
    color?: string;
    emissiveIntensity?: number;
}

// Конфигурация типа врага
export interface EnemyTypeConfig {
    type: EnemyType;
    baseHealth: number;
    baseDamage: number;
    baseSpeed: number;
    collisionRadius: number;
    poolSize: number;
    behaviors: EnemyBehavior[];
    lodDistances: [number, number, number];
    spawnWeight: number; // Вес для случайного спавна
}

// Зона спавна
export interface SpawnZone {
    id: string;
    center: THREE.Vector3;
    radius: number;
    allowedTypes: EnemyType[];
    spawnRate: number; // Врагов в секунду
    maxEnemies: number;
    difficultyMultiplier: number;
    isActive: boolean;
}

// Статистика
export interface EnemyPoolStats {
    totalPooled: number;
    totalActive: number;
    byType: Record<EnemyType, { pooled: number; active: number }>;
    spawnRate: number;
    despawnRate: number;
    averageLOD: number;
    memoryEstimate: number;
}

// Конфигурации типов врагов по умолчанию
const DEFAULT_ENEMY_CONFIGS: Record<EnemyType, EnemyTypeConfig> = {
    // 🪱 ГЕЛЬМІНТИ
    GLOBUS_VULGARIS: { type: 'GLOBUS_VULGARIS', baseHealth: 3, baseDamage: 1, baseSpeed: 1, collisionRadius: 1.1, poolSize: 20, behaviors: ['static'], lodDistances: [15, 30, 60], spawnWeight: 30 },
    GLOBUS_IRRITATUS: { type: 'GLOBUS_IRRITATUS', baseHealth: 5, baseDamage: 1, baseSpeed: 1.2, collisionRadius: 1.2, poolSize: 15, behaviors: ['drifting'], lodDistances: [15, 30, 60], spawnWeight: 15 },
    GLOBUS_MAXIMUS: { type: 'GLOBUS_MAXIMUS', baseHealth: 50, baseDamage: 2, baseSpeed: 0.8, collisionRadius: 2.2, poolSize: 5, behaviors: ['static'], lodDistances: [30, 60, 120], spawnWeight: 2 },
    VERMIS_ELECTRICUS: { type: 'VERMIS_ELECTRICUS', baseHealth: 2, baseDamage: 2, baseSpeed: 1.5, collisionRadius: 0.9, poolSize: 10, behaviors: ['drifting'], lodDistances: [15, 30, 60], spawnWeight: 10 },
    VERMIS_OSCILLANS: { type: 'VERMIS_OSCILLANS', baseHealth: 3, baseDamage: 1, baseSpeed: 1.5, collisionRadius: 0.8, poolSize: 10, behaviors: ['jumping'], lodDistances: [15, 30, 60], spawnWeight: 12 },

    // 🦠 ПРОКАРІОТИ
    COCCUS_SIMPLEX: { type: 'COCCUS_SIMPLEX', baseHealth: 1, baseDamage: 1, baseSpeed: 1, collisionRadius: 0.6, poolSize: 30, behaviors: ['static'], lodDistances: [10, 25, 50], spawnWeight: 40 },
    BACILLUS_MAGNUS: { type: 'BACILLUS_MAGNUS', baseHealth: 5, baseDamage: 1, baseSpeed: 0.8, collisionRadius: 1.0, poolSize: 15, behaviors: ['static'], lodDistances: [15, 35, 70], spawnWeight: 20 },
    STREPTOCOCCUS_CHAIN: { type: 'STREPTOCOCCUS_CHAIN', baseHealth: 3, baseDamage: 1, baseSpeed: 1.2, collisionRadius: 0.7, poolSize: 15, behaviors: ['drifting'], lodDistances: [15, 30, 60], spawnWeight: 15 },
    BACTERIUM_FELIX: { type: 'BACTERIUM_FELIX', baseHealth: 1, baseDamage: 1, baseSpeed: 1.5, collisionRadius: 0.8, poolSize: 15, behaviors: ['static'], lodDistances: [10, 25, 50], spawnWeight: 15 },
    BACTERIUM_SPORE: { type: 'BACTERIUM_SPORE', baseHealth: 1, baseDamage: 1, baseSpeed: 0, collisionRadius: 0.3, poolSize: 40, behaviors: ['static'], lodDistances: [5, 15, 30], spawnWeight: 25 },
    BACTERIUM_FLAGELLUM: { type: 'BACTERIUM_FLAGELLUM', baseHealth: 4, baseDamage: 1, baseSpeed: 2.0, collisionRadius: 0.8, poolSize: 15, behaviors: ['chasing'], lodDistances: [15, 35, 70], spawnWeight: 10 },

    // 🔴 ПАТОГЕНИ
    VIRUS_CORONA: { type: 'VIRUS_CORONA', baseHealth: 10, baseDamage: 999, baseSpeed: 1.0, collisionRadius: 1.0, poolSize: 15, behaviors: ['static'], lodDistances: [20, 40, 80], spawnWeight: 8 },
    VIRUS_MOBILIS: { type: 'VIRUS_MOBILIS', baseHealth: 5, baseDamage: 999, baseSpeed: 1.8, collisionRadius: 1.0, poolSize: 15, behaviors: ['jumping'], lodDistances: [20, 40, 80], spawnWeight: 7 },
    VIRUS_GIGANTUS: { type: 'VIRUS_GIGANTUS', baseHealth: 100, baseDamage: 999, baseSpeed: 0.5, collisionRadius: 2.5, poolSize: 5, behaviors: ['static'], lodDistances: [40, 80, 160], spawnWeight: 1 },
    VIRUS_INVISIBLE: { type: 'VIRUS_INVISIBLE', baseHealth: 1, baseDamage: 999, baseSpeed: 1.0, collisionRadius: 1.0, poolSize: 10, behaviors: ['drifting'], lodDistances: [10, 20, 40], spawnWeight: 3 },

    // ⚪ ЗАХИСНИКИ
    LEUKOCYTE_PATROL: { type: 'LEUKOCYTE_PATROL', baseHealth: 20, baseDamage: 0, baseSpeed: 1.2, collisionRadius: 1.2, poolSize: 10, behaviors: ['patrolling'], lodDistances: [20, 40, 80], spawnWeight: 10 },
    NEUTROPHIL_AGGRESSIVE: { type: 'NEUTROPHIL_AGGRESSIVE', baseHealth: 10, baseDamage: 1, baseSpeed: 2.5, collisionRadius: 1.0, poolSize: 10, behaviors: ['chasing'], lodDistances: [20, 40, 80], spawnWeight: 8 },
    MACROPHAGE_GIANT: { type: 'MACROPHAGE_GIANT', baseHealth: 200, baseDamage: 0.5, baseSpeed: 0.5, collisionRadius: 3.5, poolSize: 5, behaviors: ['static'], lodDistances: [50, 100, 200], spawnWeight: 1 },
    MAST_CELL: { type: 'MAST_CELL', baseHealth: 5, baseDamage: 1, baseSpeed: 0, collisionRadius: 1.3, poolSize: 15, behaviors: ['static'], lodDistances: [15, 30, 60], spawnWeight: 10 },

    // 🔵 СТРУКТУРИ
    MEMBRANA_SIMPLEX: { type: 'MEMBRANA_SIMPLEX', baseHealth: 100, baseDamage: 99, baseSpeed: 0, collisionRadius: 1.5, poolSize: 10, behaviors: ['static'], lodDistances: [20, 50, 100], spawnWeight: 5 },
    MEMBRANA_GLUTINOSA: { type: 'MEMBRANA_GLUTINOSA', baseHealth: 100, baseDamage: 0, baseSpeed: 0, collisionRadius: 1.5, poolSize: 10, behaviors: ['static'], lodDistances: [20, 50, 100], spawnWeight: 5 },
    MEMBRANA_ROTANS: { type: 'MEMBRANA_ROTANS', baseHealth: 100, baseDamage: 99, baseSpeed: 0, collisionRadius: 2.0, poolSize: 10, behaviors: ['static'], lodDistances: [20, 50, 100], spawnWeight: 3 },
    MEMBRANA_OBSCURA: { type: 'MEMBRANA_OBSCURA', baseHealth: 100, baseDamage: 0, baseSpeed: 0, collisionRadius: 3.0, poolSize: 5, behaviors: ['static'], lodDistances: [20, 50, 100], spawnWeight: 2 }
};

class EnemyPoolManager {
    private static instance: EnemyPoolManager;

    // Пулы врагов по типам
    private pools: Map<EnemyType, EnemyState[]> = new Map();

    // Активные враги (для быстрого доступа)
    private activeEnemies: Map<string, EnemyState> = new Map();

    // Зоны спавна
    private spawnZones: Map<string, SpawnZone> = new Map();

    // Конфигурации
    private configs: Map<EnemyType, EnemyTypeConfig> = new Map();

    // Позиция игрока для LOD и кулинга
    private playerPosition = new THREE.Vector3();

    // Настройки производительности
    private maxActiveEnemies = 50;
    private cullDistance = 100;


    // Статистика
    private stats: EnemyPoolStats = {
        totalPooled: 0,
        totalActive: 0,
        byType: {} as Record<EnemyType, { pooled: number; active: number }>,
        spawnRate: 0,
        despawnRate: 0,
        averageLOD: 0,
        memoryEstimate: 0
    };

    // Счётчики для статистики
    private spawnCount = 0;
    private despawnCount = 0;
    private lastStatsUpdate = 0;

    // ID генератор
    private nextId = 0;

    // Callbacks
    private onSpawnCallbacks: Set<(enemy: EnemyState) => void> = new Set();
    private onDespawnCallbacks: Set<(enemy: EnemyState) => void> = new Set();
    private onUpdateCallbacks: Set<(enemies: EnemyState[]) => void> = new Set();

    private constructor() {
        this.initializeConfigs();
        this.initializePools();
    }

    public static getInstance(): EnemyPoolManager {
        if (!EnemyPoolManager.instance) {
            EnemyPoolManager.instance = new EnemyPoolManager();
        }
        return EnemyPoolManager.instance;
    }

    /**
     * Инициализация конфигураций
     */
    private initializeConfigs(): void {
        Object.values(DEFAULT_ENEMY_CONFIGS).forEach(config => {
            this.configs.set(config.type, { ...config });
        });
    }

    /**
     * Инициализация пулов
     */
    private initializePools(): void {
        this.configs.forEach((config, type) => {
            const pool: EnemyState[] = [];

            for (let i = 0; i < config.poolSize; i++) {
                pool.push(this.createEnemyState(type, `${type}_pool_${i}`));
            }

            this.pools.set(type, pool);
            this.stats.byType[type] = { pooled: config.poolSize, active: 0 };
        });

        this.updateStats();
        if (import.meta.env.DEV) {
            console.log('👾 Enemy Pool Manager initialized');
        }
    }

    /**
     * Создание состояния врага
     */
    private createEnemyState(type: EnemyType, id: string): EnemyState {
        const config = this.configs.get(type)!;

        return {
            id,
            type,
            isActive: false,
            isVisible: false,
            position: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            scale: 1,
            health: config.baseHealth,
            maxHealth: config.baseHealth,
            damage: config.baseDamage,
            behavior: config.behaviors[0] ?? 'static',
            behaviorState: {},
            lodLevel: 0,
            animationSpeed: 1,
            spawnTime: 0,
            lastUpdateTime: 0,
            collisionRadius: config.collisionRadius
        };
    }

    /**
     * Генерация уникального ID
     */
    private generateId(type: EnemyType): string {
        return `${type}_${Date.now()}_${this.nextId++}`;
    }

    // ==================== SPAWN / DESPAWN ====================

    /**
     * Спавн врага из пула
     */
    public spawn(options: {
        type: EnemyType;
        position: THREE.Vector3;
        behavior?: EnemyBehavior;
        scale?: number;
        difficultyMultiplier?: number;
    }): EnemyState | null {
        // Проверяем лимит активных врагов
        if (this.activeEnemies.size >= this.maxActiveEnemies) {
            return null;
        }

        const pool = this.pools.get(options.type);
        if (!pool) return null;

        // Ищем неактивного врага в пуле
        let enemy = pool.find(e => !e.isActive);

        // Если пул исчерпан, создаём нового
        if (!enemy) {
            enemy = this.createEnemyState(options.type, this.generateId(options.type));
            pool.push(enemy);
        }

        // Настраиваем врага
        const config = this.configs.get(options.type)!;
        const difficulty = options.difficultyMultiplier ?? 1;

        enemy.isActive = true;
        enemy.isVisible = true;
        enemy.position.copy(options.position);
        enemy.velocity.set(0, 0, 0);
        enemy.rotation.set(0, 0, 0);
        enemy.scale = options.scale ?? 1;
        enemy.health = Math.ceil(config.baseHealth * difficulty);
        enemy.maxHealth = enemy.health;
        enemy.damage = Math.ceil(config.baseDamage * difficulty);
        enemy.behavior = options.behavior ?? (config.behaviors[Math.floor(Math.random() * config.behaviors.length)] ?? 'static');
        enemy.behaviorState = {};
        enemy.lodLevel = this.calculateLOD(options.position, config.lodDistances);
        enemy.animationSpeed = 0.8 + Math.random() * 0.4;
        enemy.spawnTime = Date.now();
        enemy.lastUpdateTime = Date.now();

        // Добавляем в активные
        this.activeEnemies.set(enemy.id, enemy);

        // Обновляем статистику
        this.spawnCount++;
        this.stats.byType[options.type].active++;

        // Вызываем callbacks
        this.onSpawnCallbacks.forEach(cb => cb(enemy!));

        return enemy;
    }

    /**
     * Деспавн врага (возврат в пул)
     */
    public despawn(enemyId: string): boolean {
        const enemy = this.activeEnemies.get(enemyId);
        if (!enemy) return false;

        // Деактивируем
        enemy.isActive = false;
        enemy.isVisible = false;
        enemy.position.set(0, -1000, 0); // Убираем за пределы видимости

        // Удаляем из активных
        this.activeEnemies.delete(enemyId);

        // Обновляем статистику
        this.despawnCount++;
        this.stats.byType[enemy.type].active--;

        // Вызываем callbacks
        this.onDespawnCallbacks.forEach(cb => cb(enemy));

        return true;
    }

    /**
     * Деспавн всех врагов
     */
    public despawnAll(): void {
        const ids = Array.from(this.activeEnemies.keys());
        ids.forEach(id => this.despawn(id));
    }

    // ==================== UPDATE ====================

    /**
     * Обновление всех активных врагов
     */
    public update(deltaTime: number): void {
        const now = Date.now();
        const enemies = Array.from(this.activeEnemies.values());

        enemies.forEach(enemy => {
            // Обновляем LOD
            const config = this.configs.get(enemy.type)!;
            enemy.lodLevel = this.calculateLOD(enemy.position, config.lodDistances);

            // Обновляем поведение
            this.updateBehavior(enemy, deltaTime);

            // Кулинг далёких врагов
            const distance = this.playerPosition.distanceTo(enemy.position);
            if (distance > this.cullDistance) {
                this.despawn(enemy.id);
                return;
            }

            enemy.lastUpdateTime = now;
        });

        // Обновляем статистику раз в секунду
        if (now - this.lastStatsUpdate > 1000) {
            this.updateStats();
            this.lastStatsUpdate = now;
        }

        // Вызываем callbacks
        this.onUpdateCallbacks.forEach(cb => cb(enemies));
    }

    /**
     * Обновление поведения врага
     */
    private updateBehavior(enemy: EnemyState, deltaTime: number): void {
        const config = this.configs.get(enemy.type)!;

        switch (enemy.behavior) {
            case 'drifting': {
                // Плавное движение из стороны в сторону
                if (!enemy.behaviorState.driftPhase) {
                    enemy.behaviorState.driftPhase = Math.random() * Math.PI * 2;
                }
                enemy.behaviorState.driftPhase += deltaTime * 2;
                const driftOffset = Math.sin(enemy.behaviorState.driftPhase) * 0.5;
                enemy.position.x += driftOffset * deltaTime;
                break;
            }

            case 'patrolling': {
                // Патрулирование между точками
                if (!enemy.behaviorState.patrolPoints) {
                    enemy.behaviorState.patrolPoints = [
                        enemy.position.clone(),
                        enemy.position.clone().add(new THREE.Vector3(2, 0, 0))
                    ];
                    enemy.behaviorState.patrolIndex = 0;
                }

                const patrolIndex = enemy.behaviorState.patrolIndex ?? 0;
                const points = enemy.behaviorState.patrolPoints;
                if (!points || patrolIndex === undefined) break;
                const target = points[patrolIndex];
                if (!target) break;
                const direction = target.clone().sub(enemy.position).normalize();
                enemy.position.add(direction.multiplyScalar(config.baseSpeed * deltaTime));

                if (enemy.position.distanceTo(target) < 0.1) {
                    enemy.behaviorState.patrolIndex = (patrolIndex + 1) % points.length;
                }
                break;
            }

            case 'chasing': {
                // Преследование игрока
                const toPlayer = this.playerPosition.clone().sub(enemy.position).normalize();
                enemy.position.add(toPlayer.multiplyScalar(config.baseSpeed * deltaTime * 0.5));
                break;
            }

            case 'jumping': {
                // Прыжки
                const baseY = enemy.behaviorState.baseY ?? enemy.position.y;
                if (!enemy.behaviorState.jumpPhase) {
                    enemy.behaviorState.jumpPhase = 0;
                    enemy.behaviorState.baseY = baseY;
                }
                enemy.behaviorState.jumpPhase += deltaTime * 4;
                enemy.behaviorState.baseY = baseY;
                enemy.position.y = baseY + Math.abs(Math.sin(enemy.behaviorState.jumpPhase)) * 0.5;
                break;
            }

            case 'static':
            default:
                // Статичный враг - ничего не делаем
                break;
        }
    }

    /**
     * Расчёт уровня LOD
     */
    private calculateLOD(position: THREE.Vector3, distances: [number, number, number]): number {
        const distance = this.playerPosition.distanceTo(position);

        if (distance <= distances[0]) return 0;
        if (distance <= distances[1]) return 1;
        return 2;
    }

    // ==================== COLLISION ====================

    /**
     * Проверка коллизии с точкой
     */
    public checkCollision(point: THREE.Vector3, radius: number = 0): EnemyState | null {
        for (const enemy of this.activeEnemies.values()) {
            if (!enemy.isActive) continue;

            const distance = enemy.position.distanceTo(point);
            if (distance < enemy.collisionRadius + radius) {
                return enemy;
            }
        }
        return null;
    }

    /**
     * Получение врагов в радиусе
     */
    public getEnemiesInRadius(center: THREE.Vector3, radius: number): EnemyState[] {
        const result: EnemyState[] = [];

        for (const enemy of this.activeEnemies.values()) {
            if (!enemy.isActive) continue;

            if (enemy.position.distanceTo(center) <= radius) {
                result.push(enemy);
            }
        }

        return result;
    }

    // ==================== SPAWN ZONES ====================

    /**
     * Добавление зоны спавна
     */
    public addSpawnZone(zone: Omit<SpawnZone, 'id'>): string {
        const id = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.spawnZones.set(id, { ...zone, id });
        return id;
    }

    /**
     * Удаление зоны спавна
     */
    public removeSpawnZone(zoneId: string): boolean {
        return this.spawnZones.delete(zoneId);
    }

    /**
     * Обновление спавна в зонах
     */
    public updateSpawnZones(deltaTime: number): void {
        this.spawnZones.forEach(zone => {
            if (!zone.isActive) return;

            // Считаем врагов в зоне
            const enemiesInZone = this.getEnemiesInRadius(zone.center, zone.radius);
            if (enemiesInZone.length >= zone.maxEnemies) return;

            // Спавним с заданной частотой
            const spawnChance = zone.spawnRate * deltaTime;
            if (Math.random() < spawnChance) {
                // Выбираем случайный тип из разрешённых
                const type = this.selectRandomType(zone.allowedTypes);

                // Случайная позиция в зоне
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * zone.radius;
                const position = new THREE.Vector3(
                    zone.center.x + Math.cos(angle) * distance,
                    zone.center.y,
                    zone.center.z + Math.sin(angle) * distance
                );

                this.spawn({
                    type,
                    position,
                    difficultyMultiplier: zone.difficultyMultiplier
                });
            }
        });
    }

    /**
     * Выбор случайного типа с учётом весов
     */
    private selectRandomType(allowedTypes: EnemyType[]): EnemyType {
        const weights = allowedTypes.map(type => this.configs.get(type)!.spawnWeight);
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let random = Math.random() * totalWeight;
        for (let i = 0; i < allowedTypes.length; i++) {
            const weight = weights[i];
            if (weight === undefined) continue;
            random -= weight;
            if (random <= 0) {
                return allowedTypes[i] ?? allowedTypes[0] ?? ('GLOBUS_VULGARIS' as EnemyType);
            }
        }

        return allowedTypes[0] ?? ('GLOBUS_VULGARIS' as EnemyType);
    }

    // ==================== GETTERS ====================

    /**
     * Получение всех активных врагов
     */
    public getActiveEnemies(): EnemyState[] {
        return Array.from(this.activeEnemies.values());
    }

    /**
     * Получение врагов по типу
     */
    public getEnemiesByType(type: EnemyType): EnemyState[] {
        return this.getActiveEnemies().filter(e => e.type === type);
    }

    /**
     * Получение врага по ID
     */
    public getEnemy(id: string): EnemyState | undefined {
        return this.activeEnemies.get(id);
    }

    /**
     * Получение статистики
     */
    public getStats(): EnemyPoolStats {
        return { ...this.stats };
    }

    // ==================== SETTERS ====================

    /**
     * Обновление позиции игрока
     */
    public setPlayerPosition(position: THREE.Vector3): void {
        this.playerPosition.copy(position);
    }

    /**
     * Установка максимального количества активных врагов
     */
    public setMaxActiveEnemies(max: number): void {
        this.maxActiveEnemies = max;
    }

    /**
     * Установка дистанции кулинга
     */
    public setCullDistance(distance: number): void {
        this.cullDistance = distance;
    }

    // ==================== CALLBACKS ====================

    public onSpawn(callback: (enemy: EnemyState) => void): () => void {
        this.onSpawnCallbacks.add(callback);
        return () => this.onSpawnCallbacks.delete(callback);
    }

    public onDespawn(callback: (enemy: EnemyState) => void): () => void {
        this.onDespawnCallbacks.add(callback);
        return () => this.onDespawnCallbacks.delete(callback);
    }

    public onUpdate(callback: (enemies: EnemyState[]) => void): () => void {
        this.onUpdateCallbacks.add(callback);
        return () => this.onUpdateCallbacks.delete(callback);
    }

    // ==================== STATS ====================

    private updateStats(): void {
        let totalPooled = 0;
        let totalLOD = 0;

        this.pools.forEach((pool, type) => {
            const active = pool.filter(e => e.isActive).length;
            this.stats.byType[type] = {
                pooled: pool.length,
                active
            };
            totalPooled += pool.length;
        });

        const activeEnemies = this.getActiveEnemies();
        activeEnemies.forEach(e => {
            totalLOD += e.lodLevel;
        });

        this.stats.totalPooled = totalPooled;
        this.stats.totalActive = this.activeEnemies.size;
        this.stats.spawnRate = this.spawnCount;
        this.stats.despawnRate = this.despawnCount;
        this.stats.averageLOD = activeEnemies.length > 0 ? totalLOD / activeEnemies.length : 0;
        this.stats.memoryEstimate = totalPooled * 512; // ~512 bytes per enemy state

        // Сбрасываем счётчики
        this.spawnCount = 0;
        this.despawnCount = 0;
    }

    // ==================== CLEANUP ====================

    /**
     * Полная очистка
     */
    public dispose(): void {
        this.despawnAll();
        this.pools.clear();
        this.spawnZones.clear();
        this.onSpawnCallbacks.clear();
        this.onDespawnCallbacks.clear();
        this.onUpdateCallbacks.clear();
    }
}

// Экспорт синглтона
export const enemyPool = EnemyPoolManager.getInstance();
