/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ObstaclePatternGenerator Integration - Заменяет старую систему лабиринтов
 * Теперь использует определенные паттерны препятствий вместо случайной генерации
 */

// Re-export новой системы паттернов для обратной совместимости
export { 
  ObstaclePatternGenerator,
  obstaclePatternGenerator 
} from '../patterns/ObstaclePatternGenerator';

export { 
  PatternIntegrator,
  patternIntegrator 
} from '../patterns/PatternIntegrator';

// Deprecated: старые типы лабиринтов, оставлены для совместимости
export { MazePatternType } from '../../types';

/**
 * @deprecated Используйте obstaclePatternGenerator вместо MazePatternGenerator
 * Этот класс оставлен для обратной совместимости
 */
export class MazePatternGenerator {
  constructor() {
    console.warn('MazePatternGenerator is deprecated. Use obstaclePatternGenerator instead.');
  }

  generatePattern() {
    console.warn('Use obstaclePatternGenerator.generateNextPattern() instead');
    return null;
  }
}

// Для обратной совместимости
export const mazePatternGenerator = new MazePatternGenerator();