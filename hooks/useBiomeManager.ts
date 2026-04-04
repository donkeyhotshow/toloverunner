import { useState, useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { useStore } from '../store';
import { BiomeType } from '../types';
import { BIOME_CONFIG } from '../constants';

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
    const [transitionProgress, setTransitionProgress] = useState(1);
    const [prevBiome, setPrevBiome] = useState<BiomeType>(currentBiome);
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
        setTransitionProgress(0);
        // Note: Store update happens after transition complete or immediately
        // For visual smoothness, we keep the store biome but lerp our local colors
    }, [targetBiome]);

    useFrame((_state, delta) => {
        if (transitionProgress < 1) {
            const nextProgress = Math.min(transitionProgress + delta * 0.5, 1); // 2 second transition
            setTransitionProgress(nextProgress);
            
            if (nextProgress >= 1) {
                // Finalize in store
                useStore.setState({ biome: targetBiome });
            }
        }

        // Always lerp colors towards target
        const targetData = BIOME_CONFIG[targetBiome];
        const lerpFactor = 0.05; // Smoothing factor
        
        colors.current.primary.lerp(new Color(targetData.color), lerpFactor);
        colors.current.secondary.lerp(new Color(targetData.roadColor), lerpFactor);
        colors.current.accent.lerp(new Color(targetData.accentColor), lerpFactor);
        colors.current.fog.lerp(new Color(targetData.fogColor ?? targetData.color), lerpFactor);
        colors.current.light.lerp(new Color(targetData.ambientColor ?? targetData.light ?? '#ffffff'), lerpFactor);
    });

    // Auto-trigger biome changes every 500 units for testing/infinite feel
    const lastTriggerDist = useRef(0);
    useFrame((state) => {
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
        transitionProgress,
        colors: colors.current,
        biomeData: BIOME_CONFIG[targetBiome]
    };
}
