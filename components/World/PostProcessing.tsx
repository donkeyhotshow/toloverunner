/**
 * PostProcessing - Pure Cel-shading Style
 * 
 * ВІЗУАЛЬНА ФІЛОСОФІЯ: «2D-комікс, натягнутий на 3D-світ»
 * 
 * ✅ Яскраві, чисті кольори без шуму
 * ✅ Виньєтка для органічного відчуття
 * ❌ НІЯКОГО Bloom (неонове світіння)
 * ❌ НІЯКОЇ хроматичної аберації (заважає чіткості)
 *
 * PERFORMANCE NOTE:
 * hitIntensity/perfectIntensity are refs (not state) so they never trigger re-renders.
 * The vignette effect is mutated directly in useFrame for zero-React-overhead animation.
 * The biological pulse uses clock.elapsedTime live in useFrame — the previous useMemo
 * approach was frozen because the clock object reference never changes between renders.
 */

import React, { useEffect, useRef } from 'react';
import { EffectComposer, Vignette } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import type { VignetteEffect } from 'postprocessing';

export const PostProcessing: React.FC = (): React.ReactElement | null => {
    // Refs instead of state: mutations here never cause React re-renders
    const hitIntensityRef = useRef(0);
    const perfectIntensityRef = useRef(0);
    const vignetteRef = useRef<InstanceType<typeof VignetteEffect>>(null);
    const speedRef = useRef(30);

    // Keep speedRef current without subscribing to re-renders on every speed change
    const speed = useStore(s => s.speed || 30);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    const pm = getPerformanceManager();
    const currentQuality = pm.getCurrentQuality();

    const isLowEnd = currentQuality <= QualityLevel.LOW;
    const multisampling = isLowEnd ? 2 : 4;

    // Listen for hit/perfect events and set ref values — no React re-render needed
    useEffect(() => {
        const handleHit = () => { hitIntensityRef.current = 0.8; };
        const handlePerfect = () => { perfectIntensityRef.current = 0.6; };
        
        window.addEventListener('player-hit', handleHit);
        window.addEventListener('player-perfect', handlePerfect);
        
        return () => {
            window.removeEventListener('player-hit', handleHit);
            window.removeEventListener('player-perfect', handlePerfect);
        };
    }, []);

    // 🎨 All vignette animation runs here — no React re-render, zero GC pressure
    useFrame((state, delta) => {
        // Decay intensities using frame delta (frame-rate independent, synced to R3F loop)
        if (hitIntensityRef.current > 0) {
            hitIntensityRef.current = Math.max(0, hitIntensityRef.current - delta * 6.0);
        }
        if (perfectIntensityRef.current > 0) {
            perfectIntensityRef.current = Math.max(0, perfectIntensityRef.current - delta * 4.8);
        }

        const effect = vignetteRef.current;
        if (!effect) return;

        // 💓 BIOLOGICAL PULSE: breathes with speed (previously frozen in useMemo)
        const pulse = Math.sin(state.clock.elapsedTime * speedRef.current * 0.08) * 0.05;
        const newOffset = 0.4 + pulse;

        // 🎨 VIGNETTE INTENSITY: reacts to hits
        const newDarkness = 0.3
            + hitIntensityRef.current * 0.5
            - perfectIntensityRef.current * 0.1;

        // Directly mutate the postprocessing effect — bypasses React reconciler entirely
        const vignetteEffect = effect as unknown as { offset: number; darkness: number };
        vignetteEffect.offset = newOffset;
        vignetteEffect.darkness = Math.max(0, newDarkness);
    });

    return (
        <EffectComposer
            enableNormalPass={false}
            stencilBuffer={false}
            multisampling={multisampling}
        >
            {/* 📜 VIGNETTE - subtle frame for immersion; animated via vignetteRef in useFrame */}
            <Vignette ref={vignetteRef as React.RefObject<typeof VignetteEffect>} offset={0.4} darkness={0.3} />
        </EffectComposer>
    );
};
