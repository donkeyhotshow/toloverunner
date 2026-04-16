/**
 * PostProcessing - Pure Cel-shading Style
 * 
 * ВІЗУАЛЬНА ФІЛОСОФІЯ: «2D-комікс, натягнутий на 3D-світ»
 * 
 * ✅ Яскраві, чисті кольори без шуму
 * ✅ Виньєтка для органічного відчуття
 * ✅ Хроматична аберація — ТІЛЬКИ короткий імпульс при удрі/Dash (≤60ms), потім 0
 * ❌ НІЯКОГО Bloom (неонове світіння)
 * ❌ Постійна хроматична аберація (заважає чіткості)
 *
 * PERFORMANCE NOTE:
 * hitIntensity/perfectIntensity/caIntensity are refs (not state) — no React re-renders.
 * Vignette and ChromaticAberration effects are mutated directly in useFrame.
 * The biological pulse uses clock.elapsedTime live in useFrame — the previous useMemo
 * approach was frozen because the clock object reference never changes between renders.
 */

import React, { useEffect, useRef } from 'react';
import { EffectComposer, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import { Vector2 } from 'three';
import { useStore } from '../../store';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import type { VignetteEffect, ChromaticAberrationEffect } from 'postprocessing';
import { eventBus } from '../../utils/eventBus';

// Shared zero-allocation offset vector — mutated in useFrame, never recreated
const CA_OFFSET = new Vector2(0, 0);

export const PostProcessing: React.FC = (): React.ReactElement | null => {
    // Refs instead of state: mutations here never cause React re-renders
    const hitIntensityRef = useRef(0);
    const perfectIntensityRef = useRef(0);
    // Chromatic Aberration impulse [0..1], decays to 0 in ~60ms
    const caIntensityRef = useRef(0);
    const vignetteRef = useRef<InstanceType<typeof VignetteEffect>>(null);
    const caRef = useRef<InstanceType<typeof ChromaticAberrationEffect>>(null);
    const speedRef = useRef(30);

    // Keep speedRef current without subscribing to re-renders on every speed change
    const speed = useStore(s => s.speed || 30);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    const pm = getPerformanceManager();
    const currentQuality = pm.getCurrentQuality();

    const isLowEnd = currentQuality <= QualityLevel.LOW;
    const multisampling = isLowEnd ? 2 : 4;

    // Subscribe via eventBus — single event system, no window events
    useEffect(() => {
        const unsubHit = eventBus.on('player:hit', () => {
            hitIntensityRef.current = 0.8;
            caIntensityRef.current = 1.0; // strong aberration on damage
        });
        const unsubPerfect = eventBus.on('player:perfect', () => { perfectIntensityRef.current = 0.6; });
        const unsubDash = eventBus.on('player:dash', () => {
            caIntensityRef.current = 0.7; // medium aberration on dash
        });
        return () => {
            unsubHit();
            unsubPerfect();
            unsubDash();
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
        // CA decays very fast (~60ms at full intensity)
        if (caIntensityRef.current > 0) {
            caIntensityRef.current = Math.max(0, caIntensityRef.current - delta * 16.0);
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

        // 🌈 CHROMATIC ABERRATION — brief impulse only, instantly drops to 0
        const caEffect = caRef.current;
        if (caEffect) {
            const caOffset = caIntensityRef.current * 0.004; // max 0.004 — subtle but visible
            CA_OFFSET.set(caOffset, caOffset);
            (caEffect as unknown as { offset: Vector2 }).offset = CA_OFFSET;
        }
    });

    return (
        <EffectComposer
            enableNormalPass={false}
            stencilBuffer={false}
            multisampling={multisampling}
        >
            {/* 📜 VIGNETTE - subtle frame for immersion; animated via vignetteRef in useFrame */}
            <Vignette ref={vignetteRef as unknown as React.RefObject<typeof VignetteEffect>} offset={0.4} darkness={0.3} />
            {/* 🌈 CHROMATIC ABERRATION — impulse-only; offset driven to 0 in useFrame when inactive */}
            <ChromaticAberration
                ref={caRef as unknown as React.RefObject<typeof ChromaticAberrationEffect>}
                blendFunction={BlendFunction.NORMAL}
                offset={CA_OFFSET}
                radialModulation={false}
                modulationOffset={0}
            />
        </EffectComposer>
    );
};
