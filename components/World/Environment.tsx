import React, { useRef } from 'react';
import { VeinTunnel } from './VeinTunnel'; 
import { MicroPlankton } from '../Effects/MicroPlankton';
import { useStore } from '../../store';
import { useBiomeTransition } from '../../hooks/useBiomeManager';
import { useFrame } from '@react-three/fiber';

export const Environment: React.FC = () => {
  const { colors, biomeData } = useBiomeTransition();
  const speed = useStore(s => s.speed || 30);
  
  const ambientRef = useRef<any>(null);
  const pointLightRef = useRef<any>(null);

  // 🌫️ DYNAMIC FOG: Higher speed = slightly more density (Increased baseline to hide clipping/popping)
  const dynamicFogDensity = Math.max(0.004, biomeData.fogDensity) + (speed - 30) * 0.00008;

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // 💡 LIVING LIGHTS: Subtle flicker/pulse
    if (ambientRef.current) {
        const flicker = Math.sin(time * 10) * 0.05 + 0.95;
        ambientRef.current.intensity = 3.5 * flicker;
    }

    if (pointLightRef.current) {
        // Point Light follows camera for intimate "inside vessel" lighting
        pointLightRef.current.position.copy(state.camera.position);
        pointLightRef.current.position.y += 2;
        pointLightRef.current.position.z -= 5;
        const flicker = Math.cos(time * 8) * 0.1 + 0.9;
        pointLightRef.current.intensity = 2.0 * flicker;
    }
  });

  return (
    <>
      {/* 🌫️ DYNAMIC FOG: Dense fog for visual stability / chunk hiding */}
      <fogExp2 attach="fog" color={colors.fog} density={dynamicFogDensity} />
      <color attach="background" args={[colors.fog]} />

      {/* 🩸 VEIN TUNNEL: Living Organism */}
      <VeinTunnel />

      {/* 🌫️ LIVING PARTICLES: Depth and Speed */}
      <MicroPlankton />

      {/* 🌍 LIGHTING SETUP - Dynamic & Living */}
      {/* 1. Ambient Light - High base light, biome-synced */}
      <ambientLight ref={ambientRef} intensity={3.5} color={colors.light} />

      {/* 2. Hemisphere Light - Depth shading */}
      <hemisphereLight
        intensity={1.2}
        color={colors.primary}
        groundColor={colors.secondary}
      />

      {/* 3. Point Light - Dynamic focal light */}
      <pointLight 
        ref={pointLightRef} 
        intensity={2} 
        distance={50} 
        color={colors.accent} 
      />

      {/* 4. Directional Light - Fixed Rim/Key lighting */}
      <directionalLight
        position={[0, 50, 20]}
        intensity={2.5}
        color={colors.light}
        castShadow={false}
      />
    </>
  );
};

