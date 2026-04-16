/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToLOVERunner V2 - Main App Component
 */

import React, { useEffect, useState, Suspense } from 'react';
import { debugLog } from './utils/debug';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

// Sentry is loaded dynamically to reduce initial bundle size

// Game Systems Context (DI for managers)
import { useGameSystems } from './infrastructure/context/GameSystemsContext';

// Debug globals registry
import {
  registerAllDebugGlobals,
  clearDebugGlobals,
} from './infrastructure/debug/registerDebugGlobals';

// Lazy-load heavy graphics components for code splitting

const LazyDynamicEvents = React.lazy(() =>
  import('./components/Gameplay/DynamicEvents').then((m) => ({ default: m.DynamicEvents }))
);

// RESTORED: Visual effects
const LazyPostProcessing = React.lazy(() =>
  import('./components/World/PostProcessing').then(m => ({ default: m.PostProcessing }))
);

import { FPSCounter } from './components/UI/FPSCounter';
import { EnhancedLoadingScreen } from './components/UI/EnhancedLoadingScreen';
import { useStore } from './store';
import { AppProviders } from './components/System/AppProviders';
import { TexturePreloader } from './components/System/TexturePreloader';
import { PauseSystemController } from './components/System/PauseSystem';
import { BrowserStabilityController } from './components/System/BrowserStability';
import { GameStatus } from './types';
import { DebugOverlay } from './components/UI/DebugOverlay';
import { RenderController } from './components/System/RenderController';
import { StableErrorBoundary } from './components/System/StableErrorBoundary';
import { RenderDebugger } from './components/System/RenderDebugger';
import SceneController from './components/World/SceneController';

import { GameplayFeedbackUI } from './components/UI/GameplayFeedbackUI';
import { EnhancedControls } from './components/Input/EnhancedControls';
import { AssetShowcase } from './components/Debug/AssetShowcase';
import { VintageOverlay } from './components/UI/VintageOverlay';
import { CurvedWorldEffect } from './components/Effects/CurvedWorldEffect';
import SpeedLinesEffect from './components/Effects/SpeedLinesEffect'; // 🔥 NEW: Imported SpeedLinesEffect
import { ComicPopupSystem } from './components/Effects/ComicPopupSystem';
import { UIStack } from './components/UI/UIStack';
// import { MicroPlankton } from './components/Effects/MicroPlankton'; // Moved to Environment.tsx

import { useCursorHide } from './hooks/useCursorHide'; // 🎨 Cursor hiding
import { eventBus } from './utils/eventBus';
import { DebugRecorder } from './infrastructure/debug/DebugRecorder';
import { getGeometryPool } from './infrastructure/rendering/GeometryPool';
import { accessibility } from './core/accessibility/AccessibilityManager';


/**
 * Inner App component that uses GameSystems context
 */
const AppContent: React.FC = () => {
  const init = useStore((s) => s.init);
  const status = useStore((s) => s.status);
  const showDebug = useStore((s) => s.showDebug);
  const toggleDebug = useStore((s) => s.toggleDebug);
  const setGameSceneReady = useStore((s) => s.setGameSceneReady);
  const zenMode = useStore((s) => s.zenMode);

  const [ready, setReady] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);

  // Single source of truth for scene readiness (see IMPROVEMENTS_BACKLOG 1.2)
  useEffect(() => {
    if (ready && loadingComplete) setGameSceneReady(true);
  }, [ready, loadingComplete, setGameSceneReady]);


  // Get game systems from context (DI)
  const { stabilityManager } = useGameSystems();

  // Initialize Game Store once on mount
  useEffect(() => {
    // Lazy load Sentry to reduce initial bundle size (monitoring-sentry chunk)
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
      if (!mounted) return; // Guard: component unmounted before first frame
      init();
      setReady(true);
      stabilityManager.resetStabilityScore();
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(t);
    };
  }, [init, stabilityManager]);

  // Cleanup debug globals on unmount
  useEffect(() => {
    return () => {
      // Clean up managers to prevent memory leaks
      getGeometryPool().stop();
      accessibility.dispose();
      clearDebugGlobals();
    };
  }, []);

  // Bridge window 'play-sound' CustomEvents -> typed EventBus 'system:play-sound'
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

  // F3 Key listener for debug toggle
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

  // Render Game Scene for Menu, Playing, Paused, etc.
  const showGameScene =
    status === GameStatus.MENU || // 🔥 ADDED: Show scene in menu
    status === GameStatus.PLAYING ||
    status === GameStatus.COUNTDOWN ||
    status === GameStatus.PAUSED ||
    status === GameStatus.VICTORY ||
    status === GameStatus.GAME_OVER;

  // Hide cursor during gameplay
  // IMPORTANT: Hook must be BEFORE conditional return (React Rules of Hooks)
  useCursorHide(showGameScene);

  // Show enhanced loading screen until ready and loading complete
  if (!ready || !loadingComplete) {
    return <EnhancedLoadingScreen onComplete={() => setLoadingComplete(true)} />;
  }

  return (
    <div className="relative w-full h-screen bg-[#000033] overflow-hidden select-none">

          {/* 📰 PAPER TEXTURE OVERLAY - Comic print effect */}
          <div className="paper-texture-overlay" />

          {/* Texture preloading */}
          <TexturePreloader />

          <UIStack>
            {/* UI Overlay */}
                        {!zenMode && <FPSCounter />}

            {/* Debug overlay only if enabled via F3 or dev */}
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
                logarithmicDepthBuffer: true, // 🛡️ HIGH PRECISION: Solves Z-fighting at distance
                powerPreference: 'high-performance',
                precision: 'highp',
                toneMapping: THREE.ACESFilmicToneMapping, // 🔥 ENABLED: Cinematic lighting
                toneMappingExposure: 1.0,
              }}
              // 🎥 P0: High Precision - 3000 far (increased for 2000 DRAW_DISTANCE) with LogDepthBuffer
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

                scene.background = new THREE.Color('#1a0515'); // Dark organic purple
                scene.fog = new THREE.FogExp2('#1a0515', 0.001); // Slightly denser organic fog

                // Enable color management
                THREE.ColorManagement.enabled = true;
                gl.outputColorSpace = THREE.SRGBColorSpace;

                // Register debug globals (only in dev, tree-shaken in prod)
                registerAllDebugGlobals({ gl, scene, camera });
              }}
            >
              {/* Render Debugger - respects F3 toggle */}
              {showDebug && <RenderDebugger visible={true} />}

              {/* Black Box Recorder for automated debugging */}
              <DebugRecorder />

              <RenderController />

              {/* AMBIENT PARTICLES moved to Environment.tsx */}


              {/* 🛤️ WORLD — base lights only when Environment.tsx is not yet mounted (MENU) */}
              {status === GameStatus.MENU && <ambientLight intensity={1.5} />}
              {status === GameStatus.MENU && <directionalLight position={[0, 10, 5]} intensity={2} />}

              {/* Curved World Effect for Perfect Polish */}
              <CurvedWorldEffect />

              {/* 🔥 NEW: Speed Lines Effect for Velocity Feedback */}
              {!zenMode && <SpeedLinesEffect />}

              {/* 💬 COMIC POPUPS: Text Effects */}
              {!zenMode && <ComicPopupSystem />}


              {/* MENU RUNNER PREVIEW REMOVED */}

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

              {/* DynamicEvents MUST be inside Canvas to use useThree() */}
              <Suspense fallback={null}>
                <LazyDynamicEvents />
              </Suspense>

              <EnhancedControls />
            </Canvas>
          </Suspense>
        </UIStack>

          {/* Asset Showcase Mode */}
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

          {/* Pause System (P / Escape keys) */}
          <PauseSystemController />

          {/* Browser Stability (Tab switching) */}
          <BrowserStabilityController />

          {/* DEV VERSION indicator - only if showDebug is on */}
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

/**
 * Main App component — providers wrapped in AppProviders (GameSystems + error boundaries).
 */
function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

export default App;
