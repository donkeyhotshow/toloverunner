/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ObstaclePatternGenerator - Система определенных паттернов препятствий
 * Создает заранее спроектированные последовательности препятствий для endless runner
 */

import { 
  ObstaclePattern, 
  PatternObject, 
  ObjectType, 
  PatternCategory,
  PatternGenerationConfig 
} from '../../types';

export class ObstaclePatternGenerator {
  private patterns: Map<string, ObstaclePattern> = new Map();
  private patternsByCategory: Map<PatternCategory, ObstaclePattern[]> = new Map();
  private patternsByDifficulty: Map<string, ObstaclePattern[]> = new Map();
  private recentlyUsed: string[] = [];
  private maxRecentHistory = 10;

  constructor() {
    this.initializePatterns();
    this.categorizePatterns();
  }

  /**
   * Инициализация всех паттернов препятствий
   */
  private initializePatterns() {
    // === TUTORIAL PATTERNS (Обучающие) ===
    this.addPattern({
      id: 'tutorial_single_jump',
      name: 'Single Jump',
      difficulty: 'easy',
      length: 10,
      tags: ['tutorial', 'jump', 'single'],
      description: 'Одиночное препятствие для прыжка',
      objects: [
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 5, height: 0, requiredAction: 'jump' }
      ]
    });

    this.addPattern({
      id: 'tutorial_single_dodge',
      name: 'Single Dodge',
      difficulty: 'easy',
      length: 10,
      tags: ['tutorial', 'dodge', 'single'],
      description: 'Одиночное препятствие для обхода',
      objects: [
        { type: ObjectType.OBSTACLE_DODGE, lane: 0, offset: 5, height: 2, requiredAction: 'dodge' }
      ]
    });

    this.addPattern({
      id: 'tutorial_single_slide',
      name: 'Single Slide',
      difficulty: 'easy',
      length: 10,
      tags: ['tutorial', 'slide', 'single'],
      description: 'Одиночное препятствие для скольжения',
      objects: [
        { type: ObjectType.OBSTACLE_SLIDE, lane: 0, offset: 5, height: 1, requiredAction: 'slide' }
      ]
    });

    // === BASIC PATTERNS (Базовые) ===
    this.addPattern({
      id: 'basic_left_right_choice',
      name: 'Left-Right Choice',
      difficulty: 'easy',
      length: 15,
      tags: ['basic', 'choice', 'dodge'],
      description: 'Выбор между левой и правой полосой',
      objects: [
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 8, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 1, offset: 8, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.COIN, lane: 0, offset: 8, requiredAction: 'none' }
      ]
    });

    this.addPattern({
      id: 'basic_jump_sequence',
      name: 'Jump Sequence',
      difficulty: 'easy',
      length: 20,
      tags: ['basic', 'jump', 'sequence'],
      description: 'Последовательность прыжков',
      objects: [
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 5, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 12, height: 0, requiredAction: 'jump' },
        { type: ObjectType.GENE, lane: 0, offset: 18, requiredAction: 'none' }
      ]
    });

    this.addPattern({
      id: 'basic_zigzag',
      name: 'Zigzag',
      difficulty: 'medium',
      length: 25,
      tags: ['basic', 'zigzag', 'dodge'],
      description: 'Зигзагообразное движение',
      objects: [
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 5, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 1, offset: 12, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 19, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.COIN, lane: 0, offset: 8, requiredAction: 'none' },
        { type: ObjectType.COIN, lane: 0, offset: 15, requiredAction: 'none' }
      ]
    });

    // === COMBO PATTERNS (Комбинированные) ===
    this.addPattern({
      id: 'combo_jump_slide',
      name: 'Jump-Slide Combo',
      difficulty: 'medium',
      length: 20,
      tags: ['combo', 'jump', 'slide'],
      description: 'Комбинация прыжка и скольжения',
      objects: [
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 5, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_SLIDE, lane: 0, offset: 12, height: 1, requiredAction: 'slide' },
        { type: ObjectType.SHIELD, lane: 0, offset: 18, requiredAction: 'none' }
      ]
    });

    this.addPattern({
      id: 'combo_triple_threat',
      name: 'Triple Threat',
      difficulty: 'hard',
      length: 30,
      tags: ['combo', 'jump', 'slide', 'dodge'],
      description: 'Все три типа действий подряд',
      objects: [
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 5, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_SLIDE, lane: 0, offset: 12, height: 1, requiredAction: 'slide' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 0, offset: 19, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 19, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 1, offset: 19, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.SPEED_BOOST, lane: -2, offset: 19, requiredAction: 'none' },
        { type: ObjectType.SPEED_BOOST, lane: 2, offset: 19, requiredAction: 'none' }
      ]
    });

    // === SPEED PATTERNS (Для высокой скорости) ===
    this.addPattern({
      id: 'speed_quick_dodge',
      name: 'Quick Dodge',
      difficulty: 'medium',
      length: 15,
      tags: ['speed', 'dodge', 'quick'],
      description: 'Быстрое уклонение на скорости',
      minSpeed: 40,
      objects: [
        { type: ObjectType.OBSTACLE_DODGE, lane: 0, offset: 8, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.COIN, lane: -1, offset: 8, requiredAction: 'none' },
        { type: ObjectType.COIN, lane: 1, offset: 8, requiredAction: 'none' }
      ]
    });

    this.addPattern({
      id: 'speed_tunnel_run',
      name: 'Tunnel Run',
      difficulty: 'hard',
      length: 35,
      tags: ['speed', 'tunnel', 'precision'],
      description: 'Узкий туннель на высокой скорости',
      minSpeed: 50,
      objects: [
        // Стены туннеля
        { type: ObjectType.OBSTACLE_DODGE, lane: -2, offset: 10, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 2, offset: 10, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: -2, offset: 20, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 2, offset: 20, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: -2, offset: 30, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 2, offset: 30, height: 2, requiredAction: 'dodge' },
        // Препятствия внутри
        { type: ObjectType.OBSTACLE_JUMP, lane: -1, offset: 15, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_SLIDE, lane: 1, offset: 25, height: 1, requiredAction: 'slide' },
        // Награды
        { type: ObjectType.GENE, lane: 0, offset: 12, requiredAction: 'none' },
        { type: ObjectType.GENE, lane: 0, offset: 22, requiredAction: 'none' },
        { type: ObjectType.MAGNET, lane: 0, offset: 32, requiredAction: 'none' }
      ]
    });

    // === PRECISION PATTERNS (Требуют точности) ===
    this.addPattern({
      id: 'precision_narrow_gap',
      name: 'Narrow Gap',
      difficulty: 'hard',
      length: 20,
      tags: ['precision', 'gap', 'timing'],
      description: 'Узкий проход требующий точности',
      objects: [
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 10, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 1, offset: 10, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 10, height: 0, requiredAction: 'jump' },
        { type: ObjectType.DNA_HELIX, lane: 0, offset: 15, requiredAction: 'none' }
      ]
    });

    // === ENDURANCE PATTERNS (Длинные последовательности) ===
    this.addPattern({
      id: 'endurance_marathon',
      name: 'Marathon',
      difficulty: 'expert',
      length: 50,
      tags: ['endurance', 'marathon', 'mixed'],
      description: 'Длинная последовательность различных препятствий',
      objects: this.generateMarathonPattern()
    });

    // === BOSS PATTERNS (Особо сложные) ===
    this.addPattern({
      id: 'boss_gauntlet',
      name: 'Gauntlet',
      difficulty: 'expert',
      length: 40,
      tags: ['boss', 'gauntlet', 'extreme'],
      description: 'Экстремально сложная последовательность',
      minSpeed: 60,
      objects: [
        // Первая волна - выбор пути
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 8, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 1, offset: 8, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_SLIDE, lane: 0, offset: 8, height: 1, requiredAction: 'slide' },
        
        // Вторая волна - комбо
        { type: ObjectType.OBSTACLE_JUMP, lane: -2, offset: 16, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_JUMP, lane: 2, offset: 16, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_SLIDE, lane: 0, offset: 20, height: 1, requiredAction: 'slide' },
        
        // Третья волна - финальный вызов
        { type: ObjectType.OBSTACLE_DODGE, lane: -2, offset: 28, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: -1, offset: 28, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 1, offset: 28, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_DODGE, lane: 2, offset: 28, height: 2, requiredAction: 'dodge' },
        { type: ObjectType.OBSTACLE_JUMP, lane: 0, offset: 32, height: 0, requiredAction: 'jump' },
        { type: ObjectType.OBSTACLE_SLIDE, lane: 0, offset: 36, height: 1, requiredAction: 'slide' },
        
        // Награда за прохождение
        { type: ObjectType.SHIELD, lane: 0, offset: 38, requiredAction: 'none' }
      ]
    });
  }

  /**
   * Генерирует марафонский паттерн
   */
  private generateMarathonPattern(): PatternObject[] {
    const objects: PatternObject[] = [];
    let offset = 5;

    // Создаем волны препятствий
    for (let wave = 0; wave < 5; wave++) {
      const waveType = wave % 3;
      
      switch (waveType) {
        case 0: // Jump wave
          objects.push(
            { type: ObjectType.OBSTACLE_JUMP, lane: -1, offset, height: 0, requiredAction: 'jump' },
            { type: ObjectType.OBSTACLE_JUMP, lane: 1, offset: offset + 3, height: 0, requiredAction: 'jump' },
            { type: ObjectType.COIN, lane: 0, offset: offset + 1.5, requiredAction: 'none' }
          );
          break;
          
        case 1: // Dodge wave
          objects.push(
            { type: ObjectType.OBSTACLE_DODGE, lane: 0, offset, height: 2, requiredAction: 'dodge' },
            { type: ObjectType.GENE, lane: -1, offset, requiredAction: 'none' },
            { type: ObjectType.GENE, lane: 1, offset, requiredAction: 'none' }
          );
          break;
          
        case 2: // Slide wave
          objects.push(
            { type: ObjectType.OBSTACLE_SLIDE, lane: -1, offset, height: 1, requiredAction: 'slide' },
            { type: ObjectType.OBSTACLE_SLIDE, lane: 1, offset, height: 1, requiredAction: 'slide' },
            { type: ObjectType.DNA_HELIX, lane: 0, offset: offset + 2, requiredAction: 'none' }
          );
          break;
      }
      
      offset += 8;
    }

    return objects;
  }

  /**
   * Добавляет паттерн в систему
   */
  private addPattern(pattern: ObstaclePattern) {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Категоризирует паттерны для быстрого поиска
   */
  private categorizePatterns() {
    for (const pattern of this.patterns.values()) {
      // По категориям
      const category = this.determineCategory(pattern);
      if (!this.patternsByCategory.has(category)) {
        this.patternsByCategory.set(category, []);
      }
      this.patternsByCategory.get(category)!.push(pattern);

      // По сложности
      if (!this.patternsByDifficulty.has(pattern.difficulty)) {
        this.patternsByDifficulty.set(pattern.difficulty, []);
      }
      this.patternsByDifficulty.get(pattern.difficulty)!.push(pattern);
    }
  }

  /**
   * Определяет категорию паттерна по тегам
   */
  private determineCategory(pattern: ObstaclePattern): PatternCategory {
    if (pattern.tags.includes('tutorial')) return PatternCategory.TUTORIAL;
    if (pattern.tags.includes('boss')) return PatternCategory.BOSS;
    if (pattern.tags.includes('endurance')) return PatternCategory.ENDURANCE;
    if (pattern.tags.includes('precision')) return PatternCategory.PRECISION;
    if (pattern.tags.includes('speed')) return PatternCategory.SPEED;
    if (pattern.tags.includes('combo')) return PatternCategory.COMBO;
    return PatternCategory.BASIC;
  }

  /**
   * Генерирует следующий паттерн на основе конфигурации
   */
  generateNextPattern(config: PatternGenerationConfig): ObstaclePattern | null {
    const candidates = this.findCandidatePatterns(config);
    
    if (candidates.length === 0) {
      console.warn('No suitable patterns found for config:', config);
      return null;
    }

    // Выбираем случайный паттерн из подходящих
    const selectedPattern = candidates[Math.floor(Math.random() * candidates.length)];
    if (!selectedPattern) return null;

    // Добавляем в историю использованных
    this.recentlyUsed.push(selectedPattern.id);
    if (this.recentlyUsed.length > this.maxRecentHistory) {
      this.recentlyUsed.shift();
    }

    return selectedPattern;
  }

  /**
   * Находит подходящие паттерны по конфигурации
   */
  private findCandidatePatterns(config: PatternGenerationConfig): ObstaclePattern[] {
    const allPatterns = Array.from(this.patterns.values());
    
    return allPatterns.filter(pattern => {
      // Проверяем сложность
      const difficultyScore = this.getDifficultyScore(pattern.difficulty);
      if (difficultyScore > config.difficulty + 0.3) return false;
      
      // Проверяем скорость
      if (pattern.minSpeed && config.speed < pattern.minSpeed) return false;
      if (pattern.maxSpeed && config.speed > pattern.maxSpeed) return false;
      
      // Избегаем недавно использованные
      if (config.recentPatterns.includes(pattern.id)) return false;
      if (this.recentlyUsed.includes(pattern.id)) return false;
      
      // Проверяем предпочитаемые категории
      if (config.preferredCategories.length > 0) {
        const category = this.determineCategory(pattern);
        if (!config.preferredCategories.includes(category)) return false;
      }
      
      // Проверяем длину
      if (pattern.length > config.maxLength) return false;
      
      return true;
    });
  }

  /**
   * Преобразует сложность в числовое значение
   */
  private getDifficultyScore(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 0.2;
      case 'medium': return 0.5;
      case 'hard': return 0.8;
      case 'expert': return 1.0;
      default: return 0.5;
    }
  }

  /**
   * Получает паттерн по ID
   */
  getPattern(id: string): ObstaclePattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Получает все паттерны определенной категории
   */
  getPatternsByCategory(category: PatternCategory): ObstaclePattern[] {
    return this.patternsByCategory.get(category) || [];
  }

  /**
   * Получает все паттерны определенной сложности
   */
  getPatternsByDifficulty(difficulty: string): ObstaclePattern[] {
    return this.patternsByDifficulty.get(difficulty) || [];
  }

  /**
   * Получает статистику паттернов
   */
  getStats() {
    return {
      totalPatterns: this.patterns.size,
      byCategory: Object.fromEntries(
        Array.from(this.patternsByCategory.entries()).map(([cat, patterns]) => [cat, patterns.length])
      ),
      byDifficulty: Object.fromEntries(
        Array.from(this.patternsByDifficulty.entries()).map(([diff, patterns]) => [diff, patterns.length])
      ),
      recentlyUsed: [...this.recentlyUsed]
    };
  }

  /**
   * Сбрасывает историю использованных паттернов
   */
  resetHistory() {
    this.recentlyUsed = [];
  }
}

// Singleton instance
export const obstaclePatternGenerator = new ObstaclePatternGenerator();