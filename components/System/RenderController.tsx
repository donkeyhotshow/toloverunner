/**
 * RenderController - Ensures rendering happens and monitors performance
 *
 * R3F 8.15.16 should render automatically with frameloop="always",
 * but in some configurations it doesn't. This component provides
 * a fallback manual render when needed.
 */
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';
import { registerGameLoopCallback, unregisterGameLoopCallback } from './GameLoopRegistry';

export const RenderController: React.FC = () => {
  const { gl } = useThree();
  const isDev = import.meta.env.DEV;

  // Initialize PerformanceManager with renderer
  useEffect(() => {
    if (gl) {
      const perfManager = getPerformanceManager();
      perfManager.setRenderer(gl);
      perfManager.start();

      // autoReset = true means gl.info resets after each render call
       
      gl.info.autoReset = true;

      if (isDev) {
        console.log('🎮 RenderController initialized');
      }
    }
  }, [gl, isDev]);

  useEffect(() => {
    const callback = (delta: number, _time: number) => {
      const perfManager = getPerformanceManager();
      const currentStatus = useStore.getState().status;

      // Update manager every frame for accurate FPS calculation
      perfManager.update(delta, currentStatus === GameStatus.MENU);
    };

    registerGameLoopCallback('renderUpdate', callback);
    return () => unregisterGameLoopCallback('renderUpdate', callback);
  }, []);

  return null;
};

RenderController.displayName = 'RenderController';
export default RenderController;
