/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PatternIntegrator - Интеграция паттернов с существующей системой генерации
 */

import { 
  GameObject, 
  ObjectType, 
  ObstacleType,
  ObstaclePattern, 
  PatternGenerationConfig,
  PatternCategory 
} from '../../types';
import { obstaclePatternGenerator } from './ObstaclePatternGenerator';
import { LANE_WIDTH } from '../../constants';

export class PatternIntegrator {
  private currentDistance = 0;
  private lastPatternEnd = 0;
  private playerSkillLevel = 0.3; // Начальный уровень навыка игрока
  private recentPatternIds: string[] = [];
  private difficultyProgression = 0.1; // Прогрессия сложности

  /**
   * Генерирует объекты для чанка используя паттерны
   */
  generateChunkWithPatterns(
    chunkStart: number,
    chunkLength: number,
    currentSpeed: number,
    playerScore: number,
    playerCombo: number
  ): GameObject[] {
    const objects: GameObject[] = [];
    this.currentDistance = chunkStart;

    // Обновляем уровень навыка игрока на основе производительности
    this.updatePlayerSkill(playerScore, playerCombo);

    // Определяем сложность на основе дистанции и навыка
    const difficulty = this.calculateDifficulty(chunkStart, this.playerSkillLevel);

    let currentOffset = chunkStart;
    const chunkEnd = chunkStart + chunkLength;

    while (currentOffset < chunkEnd) {
      // Определяем минимальный зазор между паттернами
      const minGap = this.calculateMinGap(currentSpeed);
      
      // Проверяем, нужен ли зазор после предыдущего паттерна
      if (currentOffset < this.lastPatternEnd + minGap) {
        currentOffset = this.lastPatternEnd + minGap;
        continue;
      }

      // Генерируем конфигурацию для следующего паттерна
      const config = this.createPatternConfig(
        difficulty,
        currentSpeed,
        chunkEnd - currentOffset
      );

      // Получаем паттерн
      const pattern = obstaclePatternGenerator.generateNextPattern(config);
      
      if (!pattern) {
        // Если паттерн не найден, добавляем простое препятствие
        objects.push(this.createSimpleObstacle(currentOffset));
        currentOffset += 15;
        continue;
      }

      // Конвертируем паттерн в игровые объекты
      const patternObjects = this.convertPatternToObjects(pattern, currentOffset);
      objects.push(...patternObjects);

      // Добавляем бонусы между паттернами
      const bonusObjects = this.generateBonusObjects(
        currentOffset + pattern.length,
        currentOffset + pattern.length + minGap,
        playerCombo
      );
      objects.push(...bonusObjects);

      // Обновляем позицию и историю
      currentOffset += pattern.length + minGap;
      this.lastPatternEnd = currentOffset;
      this.recentPatternIds.push(pattern.id);
      
      // Ограничиваем историю
      if (this.recentPatternIds.length > 5) {
        this.recentPatternIds.shift();
      }
    }

    return objects;
  }

  /**
   * Обновляет уровень навыка игрока
   */
  private updatePlayerSkill(score: number, combo: number) {
    // Базовый навык на основе очков
    const scoreSkill = Math.min(score / 10000, 0.5); // До 0.5 за очки
    
    // Навык на основе комбо
    const comboSkill = Math.min(combo / 50, 0.3); // До 0.3 за комбо
    
    // Временной навык (игрок улучшается со временем)
    const timeSkill = Math.min(this.currentDistance / 5000, 0.2); // До 0.2 за дистанцию
    
    this.playerSkillLevel = Math.min(scoreSkill + comboSkill + timeSkill, 1.0);
  }

  /**
   * Вычисляет сложность на основе дистанции и навыка игрока
   */
  private calculateDifficulty(distance: number, playerSkill: number): number {
    // Базовая прогрессия сложности по дистанции
    const distanceProgression = Math.min(distance / 3000, 0.8); // До 0.8 за дистанцию
    
    // Адаптация к навыку игрока
    const skillAdjustment = playerSkill * 0.3; // Навык может добавить до 0.3
    
    // Случайная вариация для разнообразия
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±0.1
    
    return Math.max(0.1, Math.min(1.0, 
      this.difficultyProgression + distanceProgression + skillAdjustment + randomVariation
    ));
  }

  /**
   * Вычисляет минимальный зазор между паттернами
   */
  private calculateMinGap(speed: number): number {
    // Базовый зазор зависит от скорости
    const baseGap = 20;
    const speedMultiplier = Math.max(0.5, Math.min(2.0, speed / 30));
    return baseGap * speedMultiplier;
  }

  /**
   * Создает конфигурацию для генерации паттерна
   */
  private createPatternConfig(
    difficulty: number,
    speed: number,
    remainingLength: number
  ): PatternGenerationConfig {
    // Определяем предпочитаемые категории на основе контекста
    const preferredCategories = this.determinePreferredCategories(difficulty, speed);

    return {
      difficulty,
      speed,
      playerSkill: this.playerSkillLevel,
      recentPatterns: this.recentPatternIds,
      preferredCategories,
      maxLength: Math.min(remainingLength * 0.7, 50), // Не более 70% оставшейся длины
      minGap: this.calculateMinGap(speed)
    };
  }

  /**
   * Определяет предпочитаемые категории паттернов
   */
  private determinePreferredCategories(difficulty: number, speed: number): PatternCategory[] {
    const categories: PatternCategory[] = [];

    // Начальные уровни - обучающие паттерны
    if (this.currentDistance < 500) {
      categories.push(PatternCategory.TUTORIAL);
    }

    // Базовые паттерны всегда доступны
    categories.push(PatternCategory.BASIC);

    // Комбо паттерны для среднего уровня
    if (difficulty > 0.3) {
      categories.push(PatternCategory.COMBO);
    }

    // Скоростные паттерны для высокой скорости
    if (speed > 40) {
      categories.push(PatternCategory.SPEED);
    }

    // Точные паттерны для опытных игроков
    if (this.playerSkillLevel > 0.6) {
      categories.push(PatternCategory.PRECISION);
    }

    // Выносливые паттерны для поздних стадий
    if (this.currentDistance > 2000) {
      categories.push(PatternCategory.ENDURANCE);
    }

    // Босс паттерны для экспертов
    if (difficulty > 0.8 && this.playerSkillLevel > 0.8) {
      categories.push(PatternCategory.BOSS);
    }

    return categories;
  }

  /**
   * Конвертирует паттерн в игровые объекты
   */
  private convertPatternToObjects(pattern: ObstaclePattern, startZ: number): GameObject[] {
    const objects: GameObject[] = [];

    for (const patternObj of pattern.objects) {
      const gameObject: GameObject = {
        id: `${pattern.id}_${patternObj.offset}_${Date.now()}_${Math.random()}`,
        type: patternObj.type,
        position: [
          patternObj.lane * LANE_WIDTH, // X позиция на основе полосы
          patternObj.height || 0,       // Y позиция (высота)
          startZ + patternObj.offset    // Z позиция
        ],
        active: true,
        obstacleType: this.getObstacleTypeFromObjectType(patternObj.type),
        requiredAction: patternObj.requiredAction === 'none' ? undefined : patternObj.requiredAction,
        height: patternObj.height,
        mazePatternId: pattern.id,
        properties: patternObj.properties
      };

      // Добавляем специфичные свойства для разных типов объектов
      switch (patternObj.type) {
        case ObjectType.COIN:
          gameObject.points = 50;
          gameObject.color = '#FFD700';
          break;
        case ObjectType.GENE:
          gameObject.points = 100;
          gameObject.color = '#00FF00';
          break;
        case ObjectType.DNA_HELIX:
          gameObject.points = 200;
          gameObject.color = '#FF00FF';
          gameObject.rotationSpeed = 2;
          break;
        case ObjectType.SHIELD:
          gameObject.color = '#00BFFF';
          break;
        case ObjectType.SPEED_BOOST:
          gameObject.color = '#FF4500';
          break;
        case ObjectType.MAGNET:
          gameObject.color = '#8A2BE2';
          break;
        default:
          // Препятствия
          gameObject.color = '#FF0000';
          break;
      }

      objects.push(gameObject);
    }

    return objects;
  }

  /**
   * Преобразует ObjectType в ObstacleType
   */
  private getObstacleTypeFromObjectType(type: ObjectType): ObstacleType | undefined {
    switch (type) {
      case ObjectType.OBSTACLE_JUMP:
        return ObstacleType.JUMP_ONLY;
      case ObjectType.OBSTACLE_DODGE:
        return ObstacleType.DODGE_ONLY;
      case ObjectType.OBSTACLE_SLIDE:
        return ObstacleType.SLIDE_ONLY;
      default:
        return undefined;
    }
  }

  /**
   * Создает простое препятствие как fallback
   */
  private createSimpleObstacle(z: number): GameObject {
    const lanes = [-2, -1, 0, 1, 2];
    const lane = lanes[Math.floor(Math.random() * lanes.length)] ?? 0;

    return {
      id: `simple_obstacle_${z}_${Date.now()}`,
      type: ObjectType.OBSTACLE,
      position: [lane * LANE_WIDTH, 0, z],
      active: true,
      color: '#FF0000'
    };
  }

  /**
   * Генерирует бонусные объекты между паттернами
   */
  private generateBonusObjects(startZ: number, endZ: number, combo: number): GameObject[] {
    const objects: GameObject[] = [];
    const length = endZ - startZ;
    
    // Количество бонусов зависит от длины зазора и текущего комбо
    const bonusCount = Math.floor(length / 10) + (combo > 10 ? 1 : 0);
    
    for (let i = 0; i < bonusCount; i++) {
      const z = startZ + (length / (bonusCount + 1)) * (i + 1);
      const lane = (Math.random() - 0.5) * 4; // Случайная полоса от -2 до 2
      
      // Выбираем тип бонуса
      const bonusTypes = [ObjectType.COIN, ObjectType.GENE];
      if (combo > 20) bonusTypes.push(ObjectType.DNA_HELIX);
      
      const bonusType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)] ?? ObjectType.COIN;
      
      objects.push({
        id: `bonus_${z}_${Date.now()}_${i}`,
        type: bonusType,
        position: [Math.round(lane) * LANE_WIDTH, 0, z],
        active: true,
        points: bonusType === ObjectType.COIN ? 50 : bonusType === ObjectType.GENE ? 100 : 200,
        color: bonusType === ObjectType.COIN ? '#FFD700' : 
               bonusType === ObjectType.GENE ? '#00FF00' : '#FF00FF'
      });
    }
    
    return objects;
  }

  /**
   * Получает статистику интегратора
   */
  getStats() {
    return {
      currentDistance: this.currentDistance,
      playerSkillLevel: this.playerSkillLevel,
      difficultyProgression: this.difficultyProgression,
      recentPatterns: [...this.recentPatternIds],
      patternGeneratorStats: obstaclePatternGenerator.getStats()
    };
  }

  /**
   * Сбрасывает состояние интегратора
   */
  reset() {
    this.currentDistance = 0;
    this.lastPatternEnd = 0;
    this.playerSkillLevel = 0.3;
    this.recentPatternIds = [];
    this.difficultyProgression = 0.1;
    obstaclePatternGenerator.resetHistory();
  }
}

// Singleton instance
export const patternIntegrator = new PatternIntegrator();