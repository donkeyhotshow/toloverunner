/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * usePatternGeneration - Хук для интеграции паттернов с WorldLevelManager
 */

import { useCallback, useRef } from 'react';
import { useObstaclePatterns } from '../../../hooks/useObstaclePatterns';
import { GameObject, ObjectType } from '../../../types';
import { gameObjectPool } from '../SharedPool';
import { debugLog, debugError } from '../../../utils/debug';

export const usePatternGeneration = () => {
  const { generateChunkWithPatterns, resetPatternSystem } = useObstaclePatterns();
  const lastGeneratedChunk = useRef(-1);

  /**
   * Fallback генерация простых объектов
   */
  const generateFallbackChunk = useCallback((
    chunkStart: number,
    chunkSize: number
  ): GameObject[] => {
    const objects: GameObject[] = [];
    const objectCount = Math.floor(chunkSize / 20); // Один объект на 20 единиц

    // Deterministic random helper based on chunkStart
    const seedRandom = (offset: number) => {
      const seed = chunkStart + offset;
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < objectCount; i++) {
      const z = chunkStart + (i + 1) * (chunkSize / (objectCount + 1));
      const lane = Math.floor(seedRandom(i * 10) * 5) - 2; // -2 to 2

      const obj = gameObjectPool.acquire();
      obj.id = `fallback_${chunkStart}_${i}`;
      obj.type = seedRandom(i * 10 + 1) > 0.7 ? ObjectType.COIN : ObjectType.OBSTACLE;
      obj.position = [lane * 2, 0, z]; // LANE_WIDTH = 2
      obj.active = true;
      obj.color = obj.type === ObjectType.COIN ? '#FFD700' : '#FF0000';
      obj.points = obj.type === ObjectType.COIN ? 50 : 0;

      objects.push(obj);
    }

    return objects;
  }, []);

  /**
   * Генерирует чанк объектов используя систему паттернов
   */
  const generateChunk = useCallback((
    chunkIndex: number,
    chunkSize: number,
    _playerDistance: number
  ): GameObject[] => {
    // Избегаем повторной генерации того же чанка
    if (chunkIndex === lastGeneratedChunk.current) {
      return [];
    }

    const chunkStart = chunkIndex * chunkSize;
    const objects: GameObject[] = [];

    try {
      // Используем систему паттернов для генерации
      const patternObjects = generateChunkWithPatterns(chunkStart, chunkSize);

      // Конвертируем в объекты из пула
      // 🛑 TEMPORARY FIX: Disable EVERYTHING (coins, bonuses, obstacles) as requested by user
      void patternObjects; // suppress unused variable

      lastGeneratedChunk.current = chunkIndex;

      debugLog(`🎯 Generated chunk ${chunkIndex} with ${objects.length} pattern objects`);

    } catch (error) {
      debugError('Error generating pattern chunk:', error);

      // Fallback: создаем простые объекты
      const fallbackObjects = generateFallbackChunk(chunkStart, chunkSize);
      objects.push(...fallbackObjects);
    }

    return objects;
  }, [generateChunkWithPatterns, generateFallbackChunk]);

  /**
   * Сбрасывает систему генерации паттернов
   */
  const resetGeneration = useCallback(() => {
    resetPatternSystem();
    lastGeneratedChunk.current = -1;
    debugLog('🔄 Pattern generation reset');
  }, [resetPatternSystem]);

  /**
   * Проверяет, нужно ли генерировать новый чанк
   */
  const shouldGenerateChunk = useCallback((
    chunkIndex: number,
    playerDistance: number,
    spawnDistance: number
  ): boolean => {
    const chunkStart = chunkIndex * 500; // Предполагаемый размер чанка
    const distanceToChunk = chunkStart - playerDistance;

    return distanceToChunk <= spawnDistance && chunkIndex !== lastGeneratedChunk.current;
  }, []);

  // Getter function to access ref value safely
  const getLastGeneratedChunk = useCallback(() => {
    return lastGeneratedChunk.current;
  }, []);

  return {
    generateChunk,
    resetGeneration,
    shouldGenerateChunk,
    getLastGeneratedChunk // Return getter function instead of ref value
  };
};

export default usePatternGeneration;