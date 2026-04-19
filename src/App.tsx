/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToLOVERunner V2 - Main App Component
 */

import React, { useEffect, useState, Suspense } from 'react';
import { debugLog } from '../utils/debug';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

import { useGameSystems } from '../infrastructure/context/GameSystemsContext';

import {
  registerAllDebugGlobals,
  clearDebugGlobals,
} from '../infrastructure/debug/registerDebugGlobals';

const LazyDynamicEvents = React.lazy(() =>
  import('../components/Gameplay/DynamicEvents').then((m) => ({ default: m.DynamicEvents }))
);

const LazyPostProcessing = React.lazy(() =>
  import('../components/World/PostProcessing').then(m => ({ default: m.PostProcessing }))
);

import { FPSCounter } from '../components/UI/FPSCounter';
import { EnhancedLoadingScreen } from '../components/UI/EnhancedLoadingScreen';
import { useStore } from '../store';
import { AppProviders } from '../components/System/AppProviders';
import { TexturePreloader } from '../components/System/TexturePreloader';
import { PauseSystemController } from '../components/System/PauseSystem';
import { BrowserStabilityController } from '../components/System/BrowserStability';
import { GameStatus } from '../types';
import { DebugOverlay } from '../components/UI/DebugOverlay';
import { RenderController } from '../components/System/RenderController';
import { StableErrorBoundary } from '../components/System/StableErrorBoundary';
import { RenderDebugger } from '../components/System/RenderDebugger';
import SceneController from '../components/World/SceneController';

import { GameplayFeedbackUI } from '../components/UI/GameplayFeedbackUI';
import { EnhancedControls } from '../components/Input/EnhancedControls';
import { AssetShowcase } from '../components/Debug/AssetShowcase';
import { VintageOverlay } from '../components/UI/VintageOverlay';
import { CurvedWorldEffect } from '../components/Effects/CurvedWorldEffect';
import SpeedLinesEffect from '../components/Effects/SpeedLinesEffect';
import { ComicPopupSystem } from '../components/Effects/ComicPopupSystem';
import { UIStack } from '../components/UI/UIStack';

import { useCursorHide } from '../hooks/useCursorHide';
import { eventBus } from '../utils/eventBus';
import { DebugRecorder } from '../infrastructure/debug/DebugRecorder';
import { getGeometryPool } from '../infrastructure/rendering/GeometryPool';
import { accessibility } from '../core/accessibility/AccessibilityManager';


const AppContent: React.FC = () => {
  const init = useStore((s) => s.init);
  const status = useStore((s) => s.status);
  const showDebug = useStore((s) => s.showDebug);
  const toggleDebug = useStore((s) => s.toggleDebug);
  const setGameSceneReady = useStore((s) => s.setGameSceneReady);
  const zenMode = useStore((s) => s.zenMode);

  const [ready, setReady] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    if (ready && loadingComplete) setGameSceneReady(true);
  }, [ready, loadingComplete, setGameSceneReady]);

  const { stabilityManager } = useGameSystems();

  useEffect(() => {
    if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
      import('@sentry/browser').then((Sentry) => {
        Sentry.init({
          dsn: import.meta.env.VITE_SENTRY_DSN,
          environment: import.meta.env.VITE_ENV || 'production',
          release: import.meta.env.VITE_APP_VERSION || '2.4.0',
          tracesSampleRate: 0.1,
        });
      }).catch((err) => {
        console.warn('Failed to load Sentry:', err);
      });
    }

    let mounted = true;

    const t = requestAnimationFrame(() => {
      if (!mounted) return;
      init();
      setReady(true);
      stabilityManager.resetStabilityScore();
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(t);
    };
  }, [init, stabilityManager]);

  useEffect(() => {
    return () => {
      getGeometryPool().stop();
      accessibility.dispose();
      clearDebugGlobals();
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ sound: string; volume?: number; pitch?: number } | undefined>;
      const detail = custom.detail || { sound: 'levelUp' };
      if (!detail.sound) return;
      eventBus.emit('system:play-sound', detail);
    };
    window.addEventListener('play-sound', handler as EventListener);
    return () => window.removeEventListener('play-sound', handler as EventListener);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        toggleDebug();
        debugLog('Toggle Debug Panels:', !showDebug);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDebug, showDebug]);

  const showGameScene =
    status === GameStatus.MENU ||
    status === GameStatus.PLAYING ||
    status === GameStatus.COUNTDOWN ||
    status === GameStatus.PAUSED ||
    status === GameStatus.VICTORY ||
    status === GameStatus.GAME_OVER;

  useCursorHide(showGameScene);

  if (!ready || !loadingComplete) {
    return <EnhancedLoadingScreen onComplete={() => setLoadingComplete(true)} />;
  }

  return (
    <div className="relative w-full h-screen bg-[#000033] overflow-hidden select-none">

          <div className="paper-texture-overlay" />

          <TexturePreloader />

          <UIStack>
                        {!zenMode && <FPSCounter />}

            {showDebug && <DebugOverlay enabled={showDebug} position="top-left" />}
            {showGameScene && !zenMode && <GameplayFeedbackUI />}

            <VintageOverlay />

          <Suspense fallback={null}>
            <Canvas
              data-testid="game-canvas"
              shadows={false}
              dpr={[1, 2]}
              gl={{
                antialias: true,
                alpha: false,
                stencil: false,
                depth: true,
                logarithmicDepthBuffer: true,
                powerPreference: 'high-performance',
                precision: 'highp',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.0,
              }}
              camera={{ position: [0, 3, 8], fov: 70, near: 0.1, far: 3000 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
              }}
              frameloop="always"
              onCreated={({ scene, camera, gl }) => {
                debugLog('✅ Canvas created - Renderer Ready');

                scene.background = new THREE.Color('#2A0610');
                scene.fog = new THREE.FogExp2('#2A0610', 0.0015);

                THREE.ColorManagement.enabled = true;
                gl.outputColorSpace = THREE.SRGBColorSpace;

                registerAllDebugGlobals({ gl, scene, camera });
              }}
            >
              {showDebug && <RenderDebugger visible={true} />}

              <DebugRecorder />

              <RenderController />

              {status === GameStatus.MENU && <ambientLight intensity={1.5} />}
              {status === GameStatus.MENU && <directionalLight position={[0, 10, 5]} intensity={2} />}

              <CurvedWorldEffect />

              {!zenMode && <SpeedLinesEffect />}

              {!zenMode && <ComicPopupSystem />}

              {showGameScene && (
                <Suspense fallback={null}>
                  <SceneController />
                </Suspense>
              )}

              {showGameScene && (
                <StableErrorBoundary fallback={null}>
                  <Suspense fallback={null}>
                    <LazyPostProcessing />
                  </Suspense>
                </StableErrorBoundary>
              )}

              <Suspense fallback={null}>
                <LazyDynamicEvents />
              </Suspense>

              <EnhancedControls />
            </Canvas>
          </Suspense>
        </UIStack>

          {status === GameStatus.SHOWCASE && (
            <Suspense fallback={null}>
              <Canvas
                shadows
                camera={{ position: [0, 2, 10], fov: 50 }}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 20 }}
              >
                <AssetShowcase />
              </Canvas>
            </Suspense>
          )}

          <PauseSystemController />

          <BrowserStabilityController />

          {showDebug && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                color: '#0f0',
                fontSize: '10px',
                pointerEvents: 'none',
                zIndex: 9999,
              }}
            >
              v2.4.0 | Status: {status}
            </div>
          )}
        </div>
  );
};

function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

export default App;
