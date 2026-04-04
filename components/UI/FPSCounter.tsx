/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FPS Counter Component - Real-time FPS monitoring
 * OPTIMIZED: Uses PerformanceManager instead of separate RAF loop
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';
import { UI_LAYERS } from '../../constants';

export const FPSCounter: React.FC = () => {
  const [fps, setFps] = useState(60);
  const showDebug = useStore(s => s.showDebug);
  const status = useStore(s => s.status);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;

    // OPTIMIZATION: Use PerformanceManager instead of separate RAF loop
    const pm = getPerformanceManager();

    // Update FPS from PerformanceManager every second
    const interval = setInterval(() => {
      setFps(pm.getMetrics().fps);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Don't show in menu or if debug is hidden
  if (!showDebug || status === GameStatus.MENU) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: fps < 30 ? '#ff0000' : fps < 50 ? '#ffaa00' : '#00ff00',
      padding: '5px 10px',
      fontFamily: 'monospace',
      fontSize: '14px',
      borderRadius: '5px',
      zIndex: UI_LAYERS.OVERLAY,
      pointerEvents: 'none',
      border: '2px solid #000',
    }}>
      FPS: {fps}
    </div>
  );
};
