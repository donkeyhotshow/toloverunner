/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Компонент для предзагрузки текстур при старте игры
 */

import React, { useEffect, useState } from 'react';
import { TextureType, textureManager } from '../../core/assets/TextureLoader';

interface TexturePreloaderProps {
  onComplete?: () => void;
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Компонент для предзагрузки критичных текстур
 * 
 * Загружает основные текстуры игры при монтировании компонента.
 * Показывает прогресс загрузки через callback.
 */
export const TexturePreloader: React.FC<TexturePreloaderProps> = ({
  onComplete,
  onProgress
}) => {
  const [_loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Критичные текстуры для загрузки при старте
    const criticalTextures: TextureType[] = [
      // Враги (основные)
      TextureType.ENEMY_VIRUS_PURPLE,
      TextureType.ENEMY_VIRUS_GREEN,

      // Эффекты (часто используемые)
      TextureType.FX_PARTICLE,
      TextureType.FX_GLOW,
      TextureType.FX_SPARKLE,
    ];

    let progressInterval: ReturnType<typeof setTimeout> | null = null;

    const loadTextures = async () => {
      try {
        // Начинаем загрузку
        const loadPromise = textureManager.preloadTextures(criticalTextures);

        // Отслеживаем прогресс
        progressInterval = setInterval(() => {
          const stats = textureManager.getStats();
          if (onProgress) {
            onProgress(stats.loaded, criticalTextures.length);
          }
        }, 100);

        await loadPromise;

        setLoaded(true);
        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        console.warn('Texture preload failed:', error);
        // Текстуры не создаются здесь; при ошибке TextureManager кэширует fallback и освобождает их в dispose()
        setLoaded(true);
        if (onComplete) {
          onComplete();
        }
      } finally {
        if (progressInterval) {
          clearInterval(progressInterval);
        }
      }
    };

    loadTextures();

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [onComplete, onProgress]);

  // Невидимый компонент
  return null;
};




