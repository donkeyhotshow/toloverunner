/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PatternDebugPanel - Панель отладки паттернов препятствий
 */

import React, { useState, useEffect } from 'react';
import { useObstaclePatterns } from '../../hooks/useObstaclePatterns';

/** Тип возвращаемого значения getGenerationInfo() */
interface GenerationInfo {
  currentDistance: number;
  playerSkill: number;
  difficulty: number;
  recentPatterns: string[];
  speed: number;
  score: number;
  combo: number;
}

/** Тип возвращаемого значения getRecommendedDifficulty() */
interface RecommendedDifficulty {
  current: number;
  playerSkill: number;
  recommended: number;
}

/** Тип возвращаемого значения getPatternStats() */
interface PatternStats {
  generator: { totalPatterns: number; byCategory: Record<string, number>; byDifficulty: Record<string, number> };
  integrator: { recentPatterns: string[]; [key: string]: unknown };
}

interface PatternDebugPanelProps {
  visible: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PatternDebugPanel: React.FC<PatternDebugPanelProps> = ({ 
  visible, 
  position = 'top-right' 
}) => {
  const {
    getPatternStats,
    getGenerationInfo,
    getRecommendedDifficulty,
    resetPatternSystem,
    isInitialized
  } = useObstaclePatterns();

  const [stats, setStats] = useState<PatternStats | null>(null);
  const [generationInfo, setGenerationInfo] = useState<GenerationInfo | null>(null);
  const [difficulty, setDifficulty] = useState<RecommendedDifficulty | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (visible && isInitialized) {
      const updateStats = () => {
        setStats(getPatternStats());
        setGenerationInfo(getGenerationInfo());
        setDifficulty(getRecommendedDifficulty());
      };

      updateStats();
      const interval = setInterval(updateStats, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [visible, isInitialized, getPatternStats, getGenerationInfo, getRecommendedDifficulty]);

  if (!visible || !isInitialized) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getDifficultyColor = (value: number) => {
    if (value < 0.3) return 'text-green-400';
    if (value < 0.6) return 'text-yellow-400';
    if (value < 0.8) return 'text-orange-400';
    return 'text-red-400';
  };

  const getSkillColor = (value: number) => {
    if (value < 0.3) return 'text-red-400';
    if (value < 0.6) return 'text-yellow-400';
    if (value < 0.8) return 'text-green-400';
    return 'text-blue-400';
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 pointer-events-auto`}>
      <div className="bg-black bg-opacity-80 text-white p-3 rounded-lg border border-gray-600 min-w-[280px]">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-blue-400">Pattern Debug</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              {isExpanded ? '−' : '+'}
            </button>
            <button
              onClick={resetPatternSystem}
              className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded"
              title="Reset Pattern System"
            >
              ↻
            </button>
          </div>
        </div>

        {/* Основная информация */}
        <div className="space-y-1 text-xs">
          {generationInfo && (
            <>
              <div className="flex justify-between">
                <span>Distance:</span>
                <span className="text-cyan-400">{generationInfo.currentDistance.toFixed(0)}m</span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="text-cyan-400">{generationInfo.speed.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="text-cyan-400">{generationInfo.score}</span>
              </div>
              <div className="flex justify-between">
                <span>Combo:</span>
                <span className="text-cyan-400">{generationInfo.combo}</span>
              </div>
            </>
          )}

          {difficulty && (
            <>
              <div className="flex justify-between">
                <span>Difficulty:</span>
                <span className={getDifficultyColor(difficulty.current)}>
                  {(difficulty.current * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Player Skill:</span>
                <span className={getSkillColor(difficulty.playerSkill)}>
                  {(difficulty.playerSkill * 100).toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* Расширенная информация */}
        {isExpanded && stats && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="space-y-2 text-xs">
              {/* Статистика генератора */}
              <div>
                <div className="text-yellow-400 font-semibold mb-1">Generator Stats:</div>
                <div className="flex justify-between">
                  <span>Total Patterns:</span>
                  <span>{stats.generator.totalPatterns}</span>
                </div>
                
                <div className="mt-1">
                  <div className="text-gray-400">By Category:</div>
                  {Object.entries(stats.generator.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between ml-2">
                      <span className="text-gray-300">{cat}:</span>
                      <span>{String(count)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-1">
                  <div className="text-gray-400">By Difficulty:</div>
                  {Object.entries(stats.generator.byDifficulty).map(([diff, count]) => (
                    <div key={diff} className="flex justify-between ml-2">
                      <span className="text-gray-300">{diff}:</span>
                      <span>{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Статистика интегратора */}
              <div>
                <div className="text-green-400 font-semibold mb-1">Integrator Stats:</div>
                <div className="flex justify-between">
                  <span>Recent Patterns:</span>
                  <span>{stats.integrator.recentPatterns.length}</span>
                </div>
                
                {stats.integrator.recentPatterns.length > 0 && (
                  <div className="mt-1">
                    <div className="text-gray-400">Last Used:</div>
                    <div className="ml-2 text-gray-300 max-h-20 overflow-y-auto">
                      {stats.integrator.recentPatterns.slice(-3).map((patternId: string, index: number) => (
                        <div key={index} className="truncate">
                          {patternId.replace(/^[^_]*_/, '')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => console.log('Pattern Stats:', stats)}
                  className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded flex-1"
                >
                  Log Stats
                </button>
                <button
                  onClick={() => {
                    const info = getGenerationInfo();
                    console.log('Generation Info:', info);
                  }}
                  className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded flex-1"
                >
                  Log Info
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Индикатор состояния */}
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Pattern System:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternDebugPanel;