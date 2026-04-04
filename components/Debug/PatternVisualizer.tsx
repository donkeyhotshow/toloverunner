/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PatternVisualizer - Визуализация паттернов препятствий для отладки
 */

import React, { useState, useEffect, useCallback } from 'react';
import { obstaclePatternGenerator } from '../../core/patterns/ObstaclePatternGenerator';
import { patternIntegrator } from '../../core/patterns/PatternIntegrator';
import { ObstaclePattern, PatternCategory, ObjectType } from '../../types';

interface PatternVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PatternVisualizer: React.FC<PatternVisualizerProps> = ({ isOpen, onClose }) => {
  const [selectedPattern, setSelectedPattern] = useState<ObstaclePattern | null>(null);
  const [patterns, setPatterns] = useState<ObstaclePattern[]>([]);
  const [filterCategory, setFilterCategory] = useState<PatternCategory | 'ALL'>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [stats, setStats] = useState<{ generator: ReturnType<typeof obstaclePatternGenerator.getStats>; integrator: ReturnType<typeof patternIntegrator.getStats> } | null>(null);

  const loadPatterns = useCallback(() => {
    let allPatterns: ObstaclePattern[] = [];

    if (filterCategory === 'ALL') {
      const categories = Object.values(PatternCategory);
      for (const category of categories) {
        allPatterns.push(...obstaclePatternGenerator.getPatternsByCategory(category));
      }
    } else {
      allPatterns = obstaclePatternGenerator.getPatternsByCategory(filterCategory);
    }

    if (filterDifficulty !== 'all') {
      allPatterns = allPatterns.filter(p => p.difficulty === filterDifficulty);
    }

    setPatterns(allPatterns);
  }, [filterCategory, filterDifficulty]);

  const loadStats = useCallback(() => {
    const generatorStats = obstaclePatternGenerator.getStats();
    const integratorStats = patternIntegrator.getStats();
    setStats({ generator: generatorStats, integrator: integratorStats });
  }, []);

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => {
        loadPatterns();
        loadStats();
      }, 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [isOpen, loadPatterns, loadStats]);

  const renderPatternPreview = (pattern: ObstaclePattern) => {
    const lanes = [-2, -1, 0, 1, 2];
    const maxOffset = Math.max(...pattern.objects.map(obj => obj.offset));

    return (
      <div className="pattern-preview bg-gray-800 p-4 rounded-lg">
        <h4 className="text-white font-bold mb-2">{pattern.name}</h4>
        <div className="relative bg-gray-900 rounded" style={{ height: '120px', width: '300px' }}>
          {/* Полосы */}
          {lanes.map(lane => (
            <div
              key={lane}
              className="absolute border-l border-gray-600"
              style={{
                left: `${((lane + 2) / 4) * 100}%`,
                height: '100%',
                width: '1px'
              }}
            />
          ))}
          
          {/* Объекты паттерна */}
          {pattern.objects.map((obj, index) => {
            const x = ((obj.lane + 2) / 4) * 100;
            const z = (obj.offset / maxOffset) * 90 + 5; // 5% отступ
            
            let color = '#666';
            let symbol = '?';
            
            switch (obj.type) {
              case ObjectType.OBSTACLE_JUMP:
                color = '#FF6B6B';
                symbol = '↑';
                break;
              case ObjectType.OBSTACLE_DODGE:
                color = '#FF8E53';
                symbol = '←→';
                break;
              case ObjectType.OBSTACLE_SLIDE:
                color = '#4ECDC4';
                symbol = '↓';
                break;
              case ObjectType.COIN:
                color = '#FFD93D';
                symbol = '●';
                break;
              case ObjectType.GENE:
                color = '#6BCF7F';
                symbol = '◆';
                break;
              case ObjectType.DNA_HELIX:
                color = '#A8E6CF';
                symbol = '⚡';
                break;
              case ObjectType.SHIELD:
                color = '#88D8B0';
                symbol = '🛡';
                break;
              case ObjectType.SPEED_BOOST:
                color = '#FF8B94';
                symbol = '🚀';
                break;
            }
            
            return (
              <div
                key={index}
                className="absolute flex items-center justify-center text-xs font-bold rounded"
                style={{
                  left: `${x - 2}%`,
                  top: `${z}%`,
                  width: '16px',
                  height: '16px',
                  backgroundColor: color,
                  color: obj.type.includes('OBSTACLE') ? 'white' : 'black',
                  transform: 'translate(-50%, -50%)'
                }}
                title={`${obj.type} at lane ${obj.lane}, offset ${obj.offset}`}
              >
                {symbol}
              </div>
            );
          })}
        </div>
        
        <div className="mt-2 text-sm text-gray-300">
          <div>Difficulty: <span className={`font-bold ${getDifficultyColor(pattern.difficulty)}`}>
            {pattern.difficulty}
          </span></div>
          <div>Length: {pattern.length} units</div>
          <div>Objects: {pattern.objects.length}</div>
          <div>Tags: {pattern.tags.join(', ')}</div>
        </div>
      </div>
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'expert': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const testPattern = (pattern: ObstaclePattern) => {
    console.log('Testing pattern:', pattern.name);
    console.log('Pattern objects:', pattern.objects);
    
    // Симулируем генерацию объектов
    const testObjects = patternIntegrator['convertPatternToObjects'](pattern, 0);
    console.log('Generated objects:', testObjects);
    
    alert(`Pattern "${pattern.name}" tested! Check console for details.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Pattern Visualizer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Фильтры */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Category:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as PatternCategory | 'ALL')}
              className="bg-gray-800 text-white px-3 py-1 rounded"
            >
              <option value="ALL">All Categories</option>
              {Object.values(PatternCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Difficulty:</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1 rounded"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-bold text-white mb-2">Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <strong>Total Patterns:</strong> {stats.generator.totalPatterns}
              </div>
              <div>
                <strong>Player Skill:</strong> {(stats.integrator.playerSkillLevel * 100).toFixed(1)}%
              </div>
              <div>
                <strong>Current Distance:</strong> {stats.integrator.currentDistance}m
              </div>
              <div>
                <strong>Difficulty Progression:</strong> {(stats.integrator.difficultyProgression * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className="mt-2">
              <strong className="text-white">By Category:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(stats.generator.byCategory).map(([cat, count]) => (
                  <span key={cat} className="bg-blue-600 px-2 py-1 rounded text-xs">
                    {cat}: {String(count)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Список паттернов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map(pattern => (
            <div key={pattern.id} className="relative">
              {renderPatternPreview(pattern)}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setSelectedPattern(pattern)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Details
                </button>
                <button
                  onClick={() => testPattern(pattern)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Test
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Детали выбранного паттерна */}
        {selectedPattern && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{selectedPattern.name}</h3>
                <button
                  onClick={() => setSelectedPattern(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-gray-300 space-y-2">
                <p><strong>ID:</strong> {selectedPattern.id}</p>
                <p><strong>Description:</strong> {selectedPattern.description || 'No description'}</p>
                <p><strong>Difficulty:</strong> <span className={getDifficultyColor(selectedPattern.difficulty)}>
                  {selectedPattern.difficulty}
                </span></p>
                <p><strong>Length:</strong> {selectedPattern.length} units</p>
                <p><strong>Min Speed:</strong> {selectedPattern.minSpeed || 'None'}</p>
                <p><strong>Max Speed:</strong> {selectedPattern.maxSpeed || 'None'}</p>
                <p><strong>Tags:</strong> {selectedPattern.tags.join(', ')}</p>
                
                <div>
                  <strong>Objects ({selectedPattern.objects.length}):</strong>
                  <div className="mt-2 space-y-1 max-h-40 overflow-auto">
                    {selectedPattern.objects.map((obj, index) => (
                      <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                        <strong>{obj.type}</strong> at lane {obj.lane}, offset {obj.offset}
                        {obj.height !== undefined && `, height ${obj.height}`}
                        {obj.requiredAction && `, requires ${obj.requiredAction}`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternVisualizer;