/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * React хук для использования текстур - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
 */

import { useEffect, useState, useMemo } from 'react';
import { Wrapping, Texture } from 'three';
import { textureManager, TextureType } from '../../core/assets/TextureLoader';

// Re-export TextureType for convenience
export { TextureType };

/**
 * Создать стабильный ключ для опций
 */
function createOptionsKey(options?: {
  repeat?: [number, number];
  wrapS?: Wrapping;
  wrapT?: Wrapping;
  flipY?: boolean;
}): string {
  if (!options) return 'default';
  const { repeat, wrapS, wrapT, flipY } = options;
  return `${repeat?.[0]}_${repeat?.[1]}_${wrapS}_${wrapT}_${flipY}`;
}

/**
 * Хук для загрузки и использования текстуры - ОПТИМИЗИРОВАН
 * 
 * @param type Тип текстуры
 * @param options Опции загрузки
 * @returns Загруженная текстура или null
 * 
 * Оптимизации:
 * - Удалён JSON.stringify из зависимостей (дорогая операция)
 * - Добавлен useMemo для стабильного ключа опций
 * - Улучшено управление памятью
 */
export function useTexture(
  type: TextureType,
  options?: {
    repeat?: [number, number];
    wrapS?: Wrapping;
    wrapT?: Wrapping;
    flipY?: boolean;
  }
): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);



  // Создаём стабильный ключ для опций без использования JSON.stringify
  // Создаём стабильный ключ для опций без использования JSON.stringify
  /* eslint-disable react-hooks/exhaustive-deps */
  const optionsKey = useMemo(() => createOptionsKey(options), [
    options?.repeat?.[0], options?.repeat?.[1], options?.wrapS, options?.wrapT, options?.flipY
  ]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    let mounted = true;

    textureManager
      .loadTexture(type, options)
      .then((loadedTexture) => {
        if (mounted) {
          setTexture(loadedTexture);
        }
      })
      .catch((error) => {
        console.warn(`Failed to load texture ${type}:`, error);
        if (mounted) {
          setTexture(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [type, optionsKey, options]); // Используем стабильный ключ и сам объект options

  // Apply texture properties if texture is loaded and options change
  useEffect(() => {
    if (texture && options) {
      if (options.wrapS !== undefined) texture.wrapS = options.wrapS;
      if (options.wrapT !== undefined) texture.wrapT = options.wrapT;
      if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1]);
      if (options.flipY !== undefined) texture.flipY = options.flipY;
      texture.needsUpdate = true;
    }
  }, [texture, options]);

  return texture;
}

/**
 * Хук для предзагрузки нескольких текстур
 * 
 * @param types Массив типов текстур
 * @returns true когда все текстуры загружены
 */
export function useTextures(types: TextureType[]): boolean {
  const [loaded, setLoaded] = useState(false);

  // Создаём стабильный ключ для массива типов
  const typesKey = useMemo(() => types.join('_'), [types]);

  useEffect(() => {
    setLoaded(false); // Reset loaded state when types change
    textureManager
      .preloadTextures(types)
      .then(() => setLoaded(true))
      .catch(() => setLoaded(false));
  }, [typesKey, types]); // Используем стабильный ключ и сам массив types

  return loaded;
}
