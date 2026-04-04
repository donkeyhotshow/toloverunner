/**
 * BioTrackSegment - ЧИСТАЯ КРАСНАЯ ДОРОГА (Reference Style)
 *
 * Стиль как на эталонном изображении:
 * - Яркая красная дорога
 * - Желтые разделительные линии (пунктир)
 * - Гладкая чистая поверхность
 * - Минимальный изгиб для перспективы
 * - Комичный мультяшный стиль
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { CanvasTexture, RepeatWrapping, MeshToonMaterial, DoubleSide, Group, PlaneGeometry, CylinderGeometry, BackSide } from 'three';
import { Outlines } from '../System/OutlinesShim';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { applyWorldBending } from './WorldBendingShader';
import { safeDispose } from '../../utils/errorHandler';

// 🎨 Материалы в стиле "Bright Day Organic"
// 🎨 Материалы в стиле "Bright Day Organic"
// Textures should be loaded once if possible, or via useLoader in component. 
// For now, keeping global native loader is fine, but idiomatic R3F is useTexture.
// Let's keep existing loader pattern to minimize diff, but remove the global MATERIAL.

// Generate procedural textures locally to ensure update
const createRoadTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new CanvasTexture(canvas);

  // Hazard Stripes (Black/Yellow) + Dark Red Overlay for "Bio-Hazard" look
  // 1. Base Dark Red
  ctx.fillStyle = '#400000';
  ctx.fillRect(0, 0, 512, 512);

  // 2. Black Stripes
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 20;

  // Draw ribs/stripes
  for (let i = 0; i < 512; i += 64) {
    ctx.fillRect(0, i, 512, 32); // Horizontal stripes
  }

  // 3. Noise/Grime
  ctx.fillStyle = 'rgba(50, 0, 0, 0.5)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(
      Math.random() * 512,
      Math.random() * 512,
      Math.random() * 20,
      Math.random() * 5
    );
  }

  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(1, 4);
  return tex;
};

const muscleTexture = createRoadTexture();

// Removed global 'trackMaterial' instance to prevent state leakage and ensure standard R3F behavior.


const borderMaterial = new MeshToonMaterial({
  color: '#4A0404', // Very Dark Red/Brown borders
  emissive: '#200000',
  emissiveIntensity: 0.1,
  side: DoubleSide,
});

const laneMaterial = new MeshToonMaterial({
  color: '#FF6347', // 🍅 Tomato Red/Orange for lanes
  emissive: '#FF4500',
  emissiveIntensity: 0.5,
});

interface BioTrackSegmentProps {
  length?: number;
  width?: number;
  position?: [number, number, number];
  curveAmount?: number;
}

export const BioTrackSegment: React.FC<BioTrackSegmentProps> = ({
  length = 20,
  width = 8,
  position = [0, 0, 0],
  // curveAmount = 0.3, // 🔥 МИНИМАЛЬНЫЙ изгиб для перспективы
}) => {
  const groupRef = useRef<Group>(null);
  const pm = getPerformanceManager();
  const showOutlines = typeof Outlines !== 'undefined' && pm.getCurrentQuality() >= QualityLevel.MEDIUM;

  // 🛤 ЧИСТАЯ плоская геометрия дороги (без артефактов!)
  const trackGeometry = useMemo(() => {
    const segmentsWidth = 30;
    const segmentsLength = 50;
    const geo = new PlaneGeometry(width, length, segmentsWidth, segmentsLength);
    const pos = geo.attributes.position;

    if (pos) {
      // U-Shape (Half-Pipe) Logic
      const pipeDepth = 1.5; // Reduced depth for stability
      const pipeWidth = width * 0.5;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        // Normalized X from -1 to 1
        const normalizedX = x / pipeWidth;

        // Parabolic curve: y = x^2 * depth
        // We want flat center and loose sides, so maybe x^4 or just x^2?
        // Let's try quadratic first for smooth pipe.
        const curveY = (normalizedX * normalizedX) * pipeDepth;

        pos.setY(i, curveY);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }, [width, length]);

  // 🌍 Применяем минимальный World Bending
  // Note: OrganicRoadMaterial ALREADY implements world bending in its vertex shader.
  // We should NOT apply `applyWorldBending` to it again, or it might double up or break.
  // However, `OrganicRoadMaterial` properties match `uCurvature`. we should ensure it's set.
  useEffect(() => {
    // Sync curvature
    // trackMaterial handled declaratively


    // Continue applying to other materials
    const bendingOptions = {
      curvature: 0.001, // Минимальная кривизна
      enabled: true,
      halftone: false, // Выключаем halftone для чистоты
    };
    // applyWorldBending(trackMaterial, bendingOptions); // 🚫 SKIP: Built-in to OrganicRoadMaterial
    applyWorldBending(borderMaterial, bendingOptions);
    applyWorldBending(laneMaterial, bendingOptions);
  }, []);

  // Очистка
  useEffect(() => {
    return () => {
      trackGeometry.dispose();
      // trackMaterial.dispose(); // Managed globally/constant
    };
  }, [trackGeometry]);

  const laneMarkers = useMemo(() => {
    const result: Array<{ x: number; z: number }> = [];
    const dashLength = 1.2;
    const gapLength = 0.8;
    const totalSegment = dashLength + gapLength;
    const numDashes = Math.floor(length / totalSegment);

    // Центральная линия
    for (let i = 0; i < numDashes; i++) {
      const z = -length / 2 + i * totalSegment + dashLength / 2;
      result.push({ x: 0, z });
    }

    return result;
  }, [length]);

  // 🔴 СТЕНЫ СОСУДА (Vessel Walls)
  const tunnelGeometry = useMemo(() => {
    // Полутруба (арка над дорогой или просто стены по бокам)
    const geo = new CylinderGeometry(14, 14, length, 32, 1, true, Math.PI, Math.PI);
    geo.scale(-1, 1, 1); // Инвертируем нормали
    return geo;
  }, [length]);

  const tunnelMaterial = useMemo(() => new MeshToonMaterial({
    color: '#880E4F', // Темно-бордовый
    side: BackSide,
    transparent: false, // Opaque
  }), []);

  // 🌍 Применяем World Bending к стенам
  useEffect(() => {
    applyWorldBending(tunnelMaterial, { curvature: 0.001, enabled: true, halftone: false });
  }, [tunnelMaterial]);

  // Cleanup
  useEffect(() => {
    return () => {
      tunnelGeometry.dispose();
      safeDispose(tunnelMaterial);
    };
  }, [tunnelGeometry, tunnelMaterial]);

  return (
    <group ref={groupRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 🔴 СТЕНЫ ТУННЕЛЯ */}
      <mesh geometry={tunnelGeometry} rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <primitive object={tunnelMaterial} attach="material" />
      </mesh>

      {/*  Основная красная дорога (Pipe Shape) */}
      <mesh geometry={trackGeometry}>
        <meshToonMaterial
          color={'#8B0000'}
          gradientMap={null}
          map={muscleTexture}
          side={DoubleSide}
          transparent={false}
          opacity={1.0}
        />
        {showOutlines ? <Outlines thickness={1.5} color="#000000" angle={0} /> : null}
      </mesh>

      {/* 🧱 Левый бортик - Follows Pipe Height */}
      <mesh position={[-width / 2, 3.0, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.4, length]} />
        <primitive object={borderMaterial} attach="material" />
        {showOutlines ? <Outlines thickness={2.0} color="#000000" /> : null}
      </mesh>

      {/* 🧱 Правый бортик - Follows Pipe Height */}
      <mesh position={[width / 2, 3.0, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.5, 0.4, length]} />
        <primitive object={borderMaterial} attach="material" />
        {showOutlines ? <Outlines thickness={2.0} color="#000000" /> : null}
      </mesh>

      {/* 💛 Желтые разделительные линии */}
      {laneMarkers.map((marker, i) => {
        // Formula: y = (x/w)^2 * depth
        // Center x=0 -> y=0.05
        const markerY = 0.05;

        return (
          <mesh
            key={`lane-${i}`}
            position={[marker.x, markerY, marker.z]}
          >
            <boxGeometry args={[0.25, 1.2, 0.08]} />
            <primitive object={laneMaterial} attach="material" />
            {showOutlines ? <Outlines thickness={0.5} color="#000000" /> : null}
          </mesh>
        );
      })}

    </group>
  );
};

export default BioTrackSegment;
