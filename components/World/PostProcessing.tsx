/**
 * PostProcessing - Pure Cel-shading Style
 * 
 * ВІЗУАЛЬНА ФІЛОСОФІЯ: «2D-комікс, натягнутий на 3D-світ»
 * 
 * ✅ Яскраві, чисті кольори без шуму
 * ✅ Виньєтка для органічного відчуття
 * ❌ НІЯКОГО Bloom (неонове світіння)
 * ❌ НІЯКОЇ хроматичної аберації (заважає чіткості)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EffectComposer, Vignette } from '@react-three/postprocessing';
import { useThree } from '@react-three/fiber';
import { useStore } from '../../store';
import { getPerformanceManager, QualityLevel } from '../../infrastructure/performance/PerformanceManager';

export const PostProcessing: React.FC = (): React.ReactElement | null => {
    const [hitIntensity, setHitIntensity] = useState(0);
    const [perfectIntensity, setPerfectIntensity] = useState(0);
    const speed = useStore(s => s.speed || 30);
    const pm = getPerformanceManager();
    const currentQuality = pm.getCurrentQuality();

    const isLowEnd = currentQuality <= QualityLevel.LOW;
    const multisampling = isLowEnd ? 2 : 4;

    const { clock } = useThree();

    useEffect(() => {
        const handleHit = () => setHitIntensity(0.8);
        const handlePerfect = () => setPerfectIntensity(0.6);
        
        window.addEventListener('player-hit', handleHit);
        window.addEventListener('player-perfect', handlePerfect);
        
        return () => {
            window.removeEventListener('player-hit', handleHit);
            window.removeEventListener('player-perfect', handlePerfect);
        };
    }, []);

    useEffect(() => {
        if (hitIntensity > 0 || perfectIntensity > 0) {
            const timer = requestAnimationFrame(() => {
                setHitIntensity(prev => Math.max(0, prev - 0.1));
                setPerfectIntensity(prev => Math.max(0, prev - 0.08));
            });
            return () => cancelAnimationFrame(timer);
        }
        return undefined;
    }, [hitIntensity, perfectIntensity]);

    // 💓 BIOLOGICAL PULSE: Vignette breathes with speed
    const pulseFactor = useMemo(() => {
        const base = 0.4;
        const pulse = Math.sin(clock.elapsedTime * (speed * 0.08)) * 0.05;
        return base + pulse;
    }, [clock, speed]);

    // 🎨 VIGNETTE INTENSITY - reacts to hits
    const vignetteDarkness = useMemo(() => {
        let base = 0.3; // Softer base for better visibility
        base += hitIntensity * 0.5;
        base -= perfectIntensity * 0.1;
        return base;
    }, [hitIntensity, perfectIntensity]);

    return (
        <EffectComposer
            enableNormalPass={false}
            stencilBuffer={false}
            multisampling={multisampling}
        >
            {/* 📜 VIGNETTE - subtle frame for immersion */}
            <Vignette
                offset={pulseFactor}
                darkness={vignetteDarkness}
            />
        </EffectComposer>
    );
};
