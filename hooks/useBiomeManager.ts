import { useState, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { useStore } from '../store';
import { BiomeType } from '../types';
import { BIOME_CONFIG } from '../constants';

// Module-level scratch Color — reused every frame to avoid per-frame GC pressure
const _scratchColor = new Color();

export interface BiomeVisuals {
    primary: string;
    secondary: string;
    accent: string;
    fog: string;
    light: string;
    speed: number;
    intensity: number;
}

export function useBiomeTransition() {
    const store = useStore();
    const currentBiome = (store.biome as BiomeType) || BiomeType.BIO_JUNGLE;
    // useRef instead of useState: transition progress is written every frame during a
    // 2-second window — using state would trigger ~120 unnecessary React re-renders.
    // Consumers read it inside useFrame closures, where the ref is always fresh.
    const transitionProgressRef = useRef<number>(1);
    const [_prevBiome, setPrevBiome] = useState<BiomeType>(currentBiome);
    const [targetBiome, setTargetBiome] = useState<BiomeType>(currentBiome);
    // Lerp colors for smooth transitions
    const colors = useRef({
        primary: new Color(BIOME_CONFIG[currentBiome].color),
        secondary: new Color(BIOME_CONFIG[currentBiome].roadColor),
        accent: new Color(BIOME_CONFIG[currentBiome].accentColor),
        fog: new Color(BIOME_CONFIG[currentBiome].fogColor ?? BIOME_CONFIG[currentBiome].color),
        light: new Color(BIOME_CONFIG[currentBiome].light ?? BIOME_CONFIG[currentBiome].ambientColor ?? '#ffffff')
    });

    const triggerTransition = useCallback((newBiome: BiomeType) => {
        if (newBiome === targetBiome) return;
        setPrevBiome(targetBiome);
        setTargetBiome(newBiome);
        transitionProgressRef.current = 0;
        // Note: Store update happens after transition complete or immediately
        // For visual smoothness, we keep the store biome but lerp our local colors
    }, [targetBiome]);

    useFrame((_state, delta) => {
        if (transitionProgressRef.current < 1) {
            transitionProgressRef.current = Math.min(transitionProgressRef.current + delta * 0.5, 1); // 2 second transition
            
            if (transitionProgressRef.current >= 1) {
                // Finalize in store
                useStore.setState({ biome: targetBiome });
            }
        }

        // Always lerp colors towards target — use a single scratch Color to avoid
        // allocating 5 × new Color() per frame (5 × 60fps = 300 GC objects/sec).
        const targetData = BIOME_CONFIG[targetBiome];
        const lerpFactor = 0.05; // Smoothing factor
        
        _scratchColor.set(targetData.color);
        colors.current.primary.lerp(_scratchColor, lerpFactor);
        _scratchColor.set(targetData.roadColor);
        colors.current.secondary.lerp(_scratchColor, lerpFactor);
        _scratchColor.set(targetData.accentColor);
        colors.current.accent.lerp(_scratchColor, lerpFactor);
        _scratchColor.set(targetData.fogColor ?? targetData.color);
        colors.current.fog.lerp(_scratchColor, lerpFactor);
        _scratchColor.set(targetData.ambientColor ?? targetData.light ?? '#ffffff');
        colors.current.light.lerp(_scratchColor, lerpFactor);
    });

    // Auto-trigger biome changes every 500 units for testing/infinite feel
    const lastTriggerDist = useRef(0);
    useFrame((_state) => {
        const dist = (useStore.getState() as any).totalDistance ?? 0;
        if (Math.floor(dist / 500) > Math.floor(lastTriggerDist.current / 500)) {
            lastTriggerDist.current = dist;
            if (targetBiome) {
                const biomes = Object.keys(BIOME_CONFIG) as BiomeType[];
                const currentIdx = biomes.indexOf(targetBiome);
                if (currentIdx !== -1) {
                    const nextIdx = (currentIdx + 1) % biomes.length;
                    triggerTransition(biomes[nextIdx] as BiomeType);
                }
            }
        }
    });

    return {
        currentBiome: targetBiome,
        transitionProgress: transitionProgressRef,
        colors: colors.current,
        biomeData: BIOME_CONFIG[targetBiome]
    };
}
