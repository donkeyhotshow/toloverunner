/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TexturePreloader - preloads critical textures on game start.
 * onComplete/onProgress are captured via ref to avoid re-triggering
 * the effect when parent re-renders with new function references.
 */

import React, { useEffect, useRef } from 'react';
import { TextureType, textureManager } from '../../core/assets/TextureLoader';

interface TexturePreloaderProps {
  onComplete?: () => void;
  onProgress?: (loaded: number, total: number) => void;
}

const CRITICAL_TEXTURES: TextureType[] = [
  TextureType.ENEMY_VIRUS_PURPLE,
  TextureType.ENEMY_VIRUS_GREEN,
  TextureType.FX_PARTICLE,
  TextureType.FX_GLOW,
  TextureType.FX_SPARKLE,
];

export const TexturePreloader: React.FC<TexturePreloaderProps> = ({
  onComplete,
  onProgress,
}) => {
  // Capture callbacks in refs so the effect never needs to re-run
  // when the parent passes new function references on each render.
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  useEffect(() => {
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const loadPromise = textureManager.preloadTextures(CRITICAL_TEXTURES);

        progressInterval = setInterval(() => {
          if (cancelled) return;
          const stats = textureManager.getStats();
          onProgressRef.current?.(stats.loaded, CRITICAL_TEXTURES.length);
        }, 100);

        await loadPromise;
      } catch (error) {
        console.warn('Texture preload failed:', error);
      } finally {
        if (progressInterval) clearInterval(progressInterval);
        if (!cancelled) onCompleteRef.current?.();
      }
    };

    load();

    return () => {
      cancelled = true;
      if (progressInterval) clearInterval(progressInterval);
    };
  // Empty deps: run once on mount. Callbacks are accessed via refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
