/**
 * RenderDebugger - Диагностический компонент для отладки рендеринга
 *
ает в реальном времени:
 * - renderer.info.render.calls (Draw Calls)
 * - renderer.info.render.triangles
 * - renderer.info.render.frame
 * - renderer.info.memory.geometries
 * - renderer.info.memory.textures
 * - renderer.info.programs.length (активные шейдеры)
 *
 * Использование: Добавить внутрь <Canvas>
 */

import React, { useRef, useState, useEffect } from 'react';
import { RootState, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { UI_LAYERS } from '../../constants';

interface RenderStats {
  // Render info
  drawCalls: number;
  triangles: number;
  frame: number;
  points: number;
  lines: number;

  // Memory info
  geometries: number;
  textures: number;

  // Programs (shaders)
  programs: number;

  // Scene info
  sceneChildren: number;

  // Timing
  lastRenderTime: number;
  framesSinceStart: number;

  // R3F state
  frameloopMode: string;
  isRendering: boolean;
}

export const RenderDebugger: React.FC<{ visible?: boolean }> = ({ visible = true }) => {
  const { gl, scene, camera, invalidate } = useThree();
  const [stats, setStats] = useState<RenderStats>({
    drawCalls: 0,
    triangles: 0,
    frame: 0,
    points: 0,
    lines: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    sceneChildren: 0,
    lastRenderTime: 0,
    framesSinceStart: 0,
    frameloopMode: 'unknown',
    isRendering: false,
  });

  const lastUpdateRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFrameRef = useRef(0);
  const renderingDetectedRef = useRef(false);

  // Expose debug info to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as Window & {
        __RENDER_DEBUGGER__?: {
          getStats: () => unknown;
          forceRender: () => void;
          invalidate: () => void;
          getRendererInfo: () => unknown;
          getScene: () => unknown;
        };
      };
      win.__RENDER_DEBUGGER__ = {
        getStats: () => stats,
        forceRender: () => {
          gl.render(scene, camera);
          console.log('Manual render triggered');
        },
        invalidate: () => {
          invalidate();
          console.log('Invalidate called');
        },
        getRendererInfo: () => gl.info,
        getScene: () => scene,
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as Window & { __RENDER_DEBUGGER__?: unknown }).__RENDER_DEBUGGER__;
      }
    };
  }, [gl, scene, camera, invalidate, stats]);

  // Monitor rendering via GameLoopRegistry
  useEffect(() => {
    const callback = (_delta: number, _time: number, state: RootState) => {
      frameCountRef.current++;
      const now = performance.now();

      // Throttle updates to every 500ms
      if (now - lastUpdateRef.current < 500) return;
      lastUpdateRef.current = now;

      const info = state.gl.info;
      const currentFrame = info.render?.frame || 0;

      // Detect if R3F is actually rendering
      const isRendering = currentFrame > lastFrameRef.current;
      lastFrameRef.current = currentFrame;

      if (isRendering && !renderingDetectedRef.current) {
        renderingDetectedRef.current = true;
        console.log('✅ R3F rendering detected! Frame:', currentFrame);
      }

      setStats({
        drawCalls: info.render?.calls || 0,
        triangles: info.render?.triangles || 0,
        frame: currentFrame,
        points: info.render?.points || 0,
        lines: info.render?.lines || 0,
        geometries: info.memory?.geometries || 0,
        textures: info.memory?.textures || 0,
        programs: info.programs?.length || 0,
        sceneChildren: state.scene.children.length,
        lastRenderTime: now,
        framesSinceStart: frameCountRef.current,
        frameloopMode: 'always', // R3F default
        isRendering,
      });
    };

    registerGameLoopCallback('renderUpdate', callback);
    return () => unregisterGameLoopCallback('renderUpdate', callback);
  }, []);

  if (!visible) return null;

  // Render HTML overlay inside Canvas
  return (
    <Html
      position={[0, 0, 0]}
      style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#00ff00',
        padding: '12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '11px',
        minWidth: '280px',
        zIndex: UI_LAYERS.DEBUG,
        pointerEvents: 'none',
        border: stats.isRendering ? '2px solid #00ff00' : '2px solid #ff0000',
      }}
      center={false}
      transform={false}
      occlude={false}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
        🔍 RENDER DEBUGGER
      </div>

      {/* Rendering Status */}
      <div style={{
        color: stats.isRendering ? '#00ff00' : '#ff0000',
        fontWeight: 'bold',
        marginBottom: '8px',
        padding: '4px',
        background: stats.isRendering ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
        borderRadius: '4px',
      }}>
        {stats.isRendering ? '✅ RENDERING ACTIVE' : '❌ NOT RENDERING'}
      </div>

      {/* Render Stats */}
      <div style={{ marginBottom: '6px', borderBottom: '1px solid #444', paddingBottom: '6px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>RENDER</div>
        <div>Draw Calls: <span style={{ color: stats.drawCalls > 100 ? '#ffaa00' : '#00ff00' }}>{stats.drawCalls}</span></div>
        <div>Triangles: <span style={{ color: '#00ff00' }}>{stats.triangles.toLocaleString()}</span></div>
        <div>Frame: <span style={{ color: '#00ff00' }}>{stats.frame}</span></div>
        <div>Points: {stats.points} | Lines: {stats.lines}</div>
      </div>

      {/* Memory Stats */}
      <div style={{ marginBottom: '6px', borderBottom: '1px solid #444', paddingBottom: '6px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>MEMORY</div>
        <div>Geometries: {stats.geometries}</div>
        <div>Textures: {stats.textures}</div>
      </div>

      {/* Programs (Shaders) */}
      <div style={{ marginBottom: '6px', borderBottom: '1px solid #444', paddingBottom: '6px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>SHADERS</div>
        <div>Active Programs: <span style={{ color: stats.programs > 20 ? '#ffaa00' : '#00ff00' }}>{stats.programs}</span></div>
      </div>

      {/* Scene Info */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>SCENE</div>
        <div>Root Children: {stats.sceneChildren}</div>
        <div>useFrame calls: {stats.framesSinceStart}</div>
      </div>

      {/* Console hint */}
      <div style={{ color: '#666', fontSize: '9px', marginTop: '8px' }}>
        window.__RENDER_DEBUGGER__ for API
      </div>
    </Html>
  );
};

export default RenderDebugger;
