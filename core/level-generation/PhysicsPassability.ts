/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PhysicsPassability - Валідатор фізичної прохідності паттернів
 * Забезпечує що всі згенеровані паттерни є фізично прохідними
 */

import { LevelObstacle } from './LevelObjectTypes';
import { PassageConfig, PassageType } from './PassageTypes';
import { SequenceResult } from './ObstacleSequences';

// === КОНСТАНТИ ФІЗИКИ ===

// Фізичні параметри гравця (повинні відповідати конфігу гри)
export const PLAYER_PHYSICS = {
  LANE_CHANGE_TIME: 0.2,      // Час зміни смуги (сек)
  JUMP_DURATION: 0.5,          // Тривалість прыжка
  SLIDE_DURATION: 0.4,         // Тривалість слайда
  JUMP_HEIGHT: 2.2,           // Висота прыжка
  PLAYER_WIDTH: 0.8,           // Ширина гравця
  PLAYER_HEIGHT: 1.5,          // Висота гравця стоячи
  PLAYER_HEIGHT_SLIDING: 0.6, // Висота гравця при слайді
  // Базові метрики бігу (з GDD)
  BASE_SPEED: 8.0,             // Базова швидкість
  RUN_SPEED: 8.0,              // Поточна швидкість (стартова)
  MAX_SPEED: 14.0,             // Стандартна максимальна
  MAX_HARDCORE_SPEED: 18.0,    // Максимальна для хардкору
  SPEED_GROWTH_PER_30S: 0.15,  // Приріст швидкості
  
  // Реакційні бюджети (з GDD)
  REACTION_TIME: 0.65,         // Поточний час реакції (стандарт)
  REACTION_TIME_EASY: 0.9,     // Легко (900ms)
  REACTION_TIME_STANDARD: 0.65,// Стандарт (650ms)
  REACTION_TIME_HARD: 0.45,    // Хард (450ms)

  // Анти-фрустраційні механіки
  GRACE_WINDOW_MS: 120,        // Після зміни смуги
  EDGE_CORRECTION_M: 0.3,      // Автокоррекція платформи
  IMMUNITY_AFTER_CONTINUE_S: 2.0,
  
  // 🆕 Покращені параметри
  DASH_SPEED_BOOST: 8.0,      // Прискорення від dash
  SPEED_BOOST_MULTIPLIER: 1.5, // Множник від бонусів
  FALL_MULTIPLIER: 1.3,        // Швидше падіння
};

// === РЕЗУЛЬТАТИ ВАЛІДАЦІЇ ===

export interface PassabilityResult {
  isPassable: boolean;
  issues: PassabilityIssue[];
  warnings: string[];
  metrics: {
    minReactionTime: number;
    requiredLaneChanges: number;
    totalJumpCount: number;
    totalSlideCount: number;
    totalDodgeCount: number;
    averageGap: number;
    minGap: number;
  };
}

export interface PassabilityIssue {
  type: 'fatal' | 'error' | 'warning';
  message: string;
  position?: { lane: number; z: number };
  distance?: number;
}

// === ВАЛІДАТОР ПРОХІДНОСТІ ===

export class PhysicsPassabilityValidator {
  // Перевіряє прохідність сегменту рівня
  validateSegment(
    passageConfig: PassageConfig,
    sequenceResult?: SequenceResult,
    currentSpeed: number = PLAYER_PHYSICS.RUN_SPEED
  ): PassabilityResult {
    const issues: PassabilityIssue[] = [];
    const warnings: string[] = [];
    
    // Збираємо метрики
    let minReactionTime = Infinity;
    let totalJumpCount = 0;
    let totalSlideCount = 0;
    let totalDodgeCount = 0;
    let gaps: number[] = [];
    let lastZ = 0;
    let requiredLaneChanges = 0;
    
    // Аналіз послідовності препятствий
    if (sequenceResult && sequenceResult.obstacles.length > 0) {
      const sorted = [...sequenceResult.obstacles].sort(
        (a, b) => Math.abs(a.position.z) - Math.abs(b.position.z)
      );
      
      for (let i = 0; i < sorted.length; i++) {
        const obs = sorted[i]!;
        const z = Math.abs(obs.position.z);
        
        // Підрахунок за типом
        if (obs.requiredAction === 'jump') totalJumpCount++;
        else if (obs.requiredAction === 'slide') totalSlideCount++;
        else if (obs.requiredAction === 'dodge') totalDodgeCount++;
        
        // Розрахунок зазору
        if (lastZ > 0) {
          const gap = z - lastZ;
          gaps.push(gap);
          
          // Розрахунок часу реакції
          const timeToReact = gap / currentSpeed;
          
          if (timeToReact < minReactionTime) {
            minReactionTime = timeToReact;
          }
          
          // Перевірка достатності часу для реакції
          if (timeToReact < PLAYER_PHYSICS.REACTION_TIME) {
            issues.push({
              type: 'fatal',
              message: `Занадто малий зазор ${gap.toFixed(1)}m між препятствиями. Час реакції ${timeToReact.toFixed(2)}с < ${PLAYER_PHYSICS.REACTION_TIME}с`,
              position: { lane: obs.position.x > 0 ? 1 : -1, z },
              distance: z
            });
          } else if (timeToReact < PLAYER_PHYSICS.REACTION_TIME * 1.5) {
            warnings.push(`Короткий зазор ${gap.toFixed(1)}m - потрібна швидка реакція`);
          }
        }
        
        lastZ = z;
      }
    }
    
    // Аналіз проходу
    const analysis = this.analyzePassage(passageConfig);
    issues.push(...analysis.issues);
    warnings.push(...analysis.warnings);
    requiredLaneChanges += analysis.requiredLaneChanges;
    
    // Перевірка послідовності дій
    const actionSequence = this.analyzeActionSequence(sequenceResult);
    if (!actionSequence.isValid) {
      issues.push(...actionSequence.issues);
    }
    warnings.push(...actionSequence.warnings);
    
    // Розрахунок фінальних метрик
    const metrics = {
      minReactionTime: minReactionTime === Infinity ? 0 : minReactionTime,
      requiredLaneChanges,
      totalJumpCount,
      totalSlideCount,
      totalDodgeCount,
      averageGap: gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0,
      minGap: gaps.length > 0 ? Math.min(...gaps) : 0
    };
    
    // Визначення прохідності
    const fatalIssues = issues.filter(i => i.type === 'fatal');
    const errorIssues = issues.filter(i => i.type === 'error');
    
    const isPassable = fatalIssues.length === 0 && errorIssues.length === 0;
    
    return {
      isPassable,
      issues,
      warnings,
      metrics
    };
  }

  // Аналіз проходу
  private analyzePassage(config: PassageConfig): {
    issues: PassabilityIssue[];
    warnings: string[];
    requiredLaneChanges: number;
  } {
    const issues: PassabilityIssue[] = [];
    const warnings: string[] = [];
    let requiredLaneChanges = 0;
    
    // Перевірка ширини проходу
    if (config.width < 1) {
      issues.push({
        type: 'fatal',
        message: 'Прохід занадто вузький (менше 1 смуги)',
        distance: config.length
      });
    }
    
    // Перевірка довжини
    if (config.length < 10) {
      issues.push({
        type: 'error',
        message: 'Прохід занадто короткий'
      });
    }
    
    // Перевірка складності
    if (config.difficulty > 0.9) {
      warnings.push('Дуже висока складність проходу');
    }
    
    // Перевірка зазорів
    if (config.minGap < PLAYER_PHYSICS.REACTION_TIME * PLAYER_PHYSICS.RUN_SPEED) {
      issues.push({
        type: 'error',
        message: `Мінімальний зазор ${config.minGap.toFixed(1)}m занадто малий для реакції`
      });
    }
    
    // Для деяких типів проходів потрібні додаткові перевірки
    switch (config.type) {
      case PassageType.NARROW_CORRIDOR:
        if (config.width !== 1) {
          issues.push({
            type: 'error',
            message: 'Вузький коридор повинен бути шириною в 1 смугу'
          });
        }
        requiredLaneChanges = 0; // Немає зміни смуг
        break;
        
      case PassageType.SLALOM:
      case PassageType.ZIGZAG:
        requiredLaneChanges = Math.floor(config.length / 15);
        break;
        
      case PassageType.SPLIT_PATH:
      case PassageType.CHOICE_PATH:
        requiredLaneChanges = 1; // Можливо потрібна зміна
        warnings.push('Гравець повинен вибрати шлях');
        break;
    }
    
    return { issues, warnings, requiredLaneChanges };
  }

  // Аналіз послідовності дій
  private analyzeActionSequence(sequence?: SequenceResult): {
    isValid: boolean;
    issues: PassabilityIssue[];
    warnings: string[];
  } {
    const issues: PassabilityIssue[] = [];
    const warnings: string[] = [];
    
    if (!sequence || sequence.obstacles.length === 0) {
      return { isValid: true, issues: [], warnings: [] };
    }
    
    const actions: string[] = [];
    for (const obs of sequence.obstacles) {
      if (obs.requiredAction && obs.requiredAction !== 'none') {
        actions.push(obs.requiredAction);
      }
    }
    
    // Перевірка на занадто багато однакових дій підряд
    let sameActionCount = 0;
    let lastAction = '';
    
    for (const action of actions) {
      if (action === lastAction) {
        sameActionCount++;
        
        if (sameActionCount > 5) {
          const actionType = lastAction;
          issues.push({
            type: 'warning',
            message: `Занадто багато ${actionType} дій підряд може втомити гравця`
          });
        }
      } else {
        sameActionCount = 1;
      }
      lastAction = action;
    }
    
    // Перевірка неможливих комбінацій
    // (наприклад, jump одразу після slide без часу на відновлення)
    for (let i = 1; i < actions.length; i++) {
      const prev = actions[i - 1];
      const curr = actions[i];
      
      if (prev === 'slide' && curr === 'jump') {
        warnings.push('Швидкий перехід від slide до jump може бути складним');
      }
    }
    
    return {
      isValid: issues.filter(i => i.type === 'fatal').length === 0,
      issues,
      warnings
    };
  }

  // Перевірка чи можливо пройти препятствие з поточної позиції
  canPassObstacle(
    playerLane: number,
    playerZ: number,
    obstacle: LevelObstacle,
    currentSpeed: number
  ): boolean {
    const obsX = obstacle.position.x;
    const obsZ = obstacle.position.z;
    
    // Відстань до препятствия
    const distance = obsZ - playerZ;
    
    // Негативна відстань означає що препятствие позаду
    if (distance < 0) return true;
    
    // Перевірка чи потрапляємо в препятствие
    const laneDiff = Math.abs(obsX / 2 - playerLane); // Переводимо в смуги
    
    if (laneDiff > 1.5) {
      // Препятствие на іншій смузі - можемо пройти
      return true;
    }
    
    // Час до зіткнення
    const timeToImpact = distance / currentSpeed;
    
    // Для кожного типу препятствия перевіряємо можливість
    switch (obstacle.requiredAction) {
      case 'jump':
        return timeToImpact > PLAYER_PHYSICS.JUMP_DURATION * 0.8;
        
      case 'slide':
        return timeToImpact > PLAYER_PHYSICS.SLIDE_DURATION * 0.8;
        
      case 'dodge':
        // Потрібно змінити смугу
        if (laneDiff > 0.5) {
          return timeToImpact > PLAYER_PHYSICS.LANE_CHANGE_TIME;
        }
        return false;
        
      default:
        return false;
    }
  }

  // Отримання рекомендацій для виправлення проблем
  getRecommendations(result: PassabilityIssue[]): string[] {
    const recommendations: string[] = [];
    
    for (const issue of result) {
      if (issue.type === 'fatal' || issue.type === 'error') {
        if (issue.message.includes('зазор')) {
          recommendations.push('Збільшіть мінімальний зазор між препятствиями');
        }
        if (issue.message.includes('реакц')) {
          recommendations.push('Додайте більше часу між препятствиями');
        }
        if (issue.message.includes('коридор')) {
          recommendations.push('Розширте вузький коридор');
        }
      }
    }
    
    return [...new Set(recommendations)];
  }
}

export default PhysicsPassabilityValidator;