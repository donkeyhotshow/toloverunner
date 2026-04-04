/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useObstaclePatterns - React Hook для работы с паттернами препятствий
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { patternIntegrator } from '../core/patterns/PatternIntegrator';
import { obstaclePatternGenerator } from '../core/patterns/ObstaclePatternGenerator';
import { GameObject, PatternCategory } from '../types';

export const useObstaclePatterns = () => {
  const isInitializedRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Store selectors
  const speed = useStore(state => state.speed);
  const score = useStore(state => state.score);
  const combo = useStore(state => state.combo);
  const distance = useStore(state => state.distance);

  /**
   * Инициализация системы паттернов
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🎯 Initializing Obstacle Pattern System');
      isInitializedRef.current = true;
      const id = setTimeout(() => setIsInitialized(true), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, []);

  /**
   * Генерирует объекты для чанка используя систему паттернов
   */
  const generateChunkWithPatterns = useCallback((
    chunkStart: number,
    chunkLength: number
  ): GameObject[] => {
    try {
      return patternIntegrator.generateChunkWithPatterns(
        chunkStart,
        chunkLength,
        speed,
        score,
        combo
      );
    } catch (error) {
      console.error('Error generating chunk with patterns:', error);
      return [];
    }
  }, [speed, score, combo]);

  /**
   * Получает статистику системы паттернов
   */
  const getPatternStats = useCallback(() => {
    return {
      generator: obstaclePatternGenerator.getStats(),
      integrator: patternIntegrator.getStats()
    };
  }, []);

  /**
   * Получает паттерны определенной категории
   */
  const getPatternsByCategory = useCallback((category: PatternCategory) => {
    return obstaclePatternGenerator.getPatternsByCategory(category);
  }, []);

  /**
   * Получает паттерны определенной сложности
   */
  const getPatternsByDifficulty = useCallback((difficulty: string) => {
    return obstaclePatternGenerator.getPatternsByDifficulty(difficulty);
  }, []);

  /**
   * Сбрасывает состояние системы паттернов
   */
  const resetPatternSystem = useCallback(() => {
    patternIntegrator.reset();
    console.log('🔄 Pattern system reset');
  }, []);

  /**
   * Получает рекомендуемую сложность для текущего состояния игры
   */
  const getRecommendedDifficulty = useCallback(() => {
    const stats = patternIntegrator.getStats();
    return {
      current: stats.difficultyProgression,
      playerSkill: stats.playerSkillLevel,
      recommended: Math.min(stats.difficultyProgression + 0.1, 1.0)
    };
  }, []);

  /**
   * Проверяет, подходит ли паттерн для текущих условий
   */
  const isPatternSuitable = useCallback((patternId: string) => {
    const pattern = obstaclePatternGenerator.getPattern(patternId);
    if (!pattern) return false;

    const stats = patternIntegrator.getStats();

    // Проверяем скорость
    if (pattern.minSpeed && speed < pattern.minSpeed) return false;
    if (pattern.maxSpeed && speed > pattern.maxSpeed) return false;

    // Проверяем недавнее использование
    if (stats.recentPatterns.includes(patternId)) return false;

    return true;
  }, [speed]);

  /**
   * Получает информацию о текущем состоянии генерации
   */
  const getGenerationInfo = useCallback(() => {
    const stats = patternIntegrator.getStats();
    const difficulty = getRecommendedDifficulty();

    return {
      currentDistance: distance,
      playerSkill: stats.playerSkillLevel,
      difficulty: difficulty.current,
      recentPatterns: stats.recentPatterns,
      speed,
      score,
      combo
    };
  }, [distance, speed, score, combo, getRecommendedDifficulty]);

  return {
    // Основные функции
    generateChunkWithPatterns,
    resetPatternSystem,

    // Информация и статистика
    getPatternStats,
    getGenerationInfo,
    getRecommendedDifficulty,

    // Поиск и фильтрация
    getPatternsByCategory,
    getPatternsByDifficulty,
    isPatternSuitable,

    // Состояние
    isInitialized,
  };
};

export default useObstaclePatterns;