import React, { useMemo, useRef, useEffect } from 'react';
import { ShaderMaterial, Color, BackSide, CylinderGeometry, InstancedMesh, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store';
import { useBiomeTransition } from '../../hooks/useBiomeManager';

const TUNNEL_SEGMENTS = 80;
const SEGMENT_LENGTH = 10;
const TUNNEL_RADIUS = 15; // 🩺 Tighter radius for "tube" feel

export const VeinTunnel: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    const { colors, transitionProgress, biomeData } = useBiomeTransition();
    
    // Optimized low-poly segments for instancing
    const geo = useMemo(() => new CylinderGeometry(
        TUNNEL_RADIUS, TUNNEL_RADIUS, SEGMENT_LENGTH, 
        16, 1, true
    ).rotateX(Math.PI / 2), []);

    const material = useMemo(() => new ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uScrollOffset: { value: 0 },
            uTransitionProgress: { value: 1.0 },
            uColor1: { value: new Color() },
            uColor2: { value: new Color() },
            uAccent: { value: new Color() },
            uPulseSpeed: { value: 0.5 },
            uWaveIntensity: { value: 0.8 },
            uCurve: { value: 0.001 }
        },
        vertexShader: `
            varying highp vec2 vUv;
            varying highp vec3 vPos;
            uniform highp float uCurve;
            
            void main() {
                vUv = uv;
                vPos = position;
                vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                
                // World Bending Logic
                highp float distFromCamera = worldPos.z - cameraPosition.z;
                worldPos.y -= distFromCamera * distFromCamera * uCurve;
                
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            precision highp float;
            uniform highp float uTime;
            uniform highp float uScrollOffset;
            uniform highp float uTransitionProgress;
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform vec3 uAccent;
            uniform float uPulseSpeed;
            uniform float uWaveIntensity;
            varying highp vec2 vUv;
            varying highp vec3 vPos;
            
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f*f*(3.0-2.0*f);
                return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), f.x),
                           mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), f.x), f.y);
            }

            void main() {
                // 🚂 HIGH PRECISION UV SCROLLING
                highp vec2 uv = vUv;
                uv.y += mod(uScrollOffset * 0.01, 100.0);
                
                // --- ORGANIC TISSUE: NOISE & WAVES ---
                float n = noise(uv * vec2(32.0, 10.0) + uTime * 0.2);
                float tissue = step(0.4, n);
                
                // 🌊 SURFACE WAVE
                float wave = sin(vUv.y * 20.0 - uTime * 2.0) * uWaveIntensity;
                
                // BIOME BLENDING
                vec3 finalColor = mix(uColor2, uColor1, tissue + wave * 0.5);
                
                // Vignette for depth perception
                float vignette = 1.0 - abs(vUv.x - 0.5) * 2.0;
                vignette = smoothstep(0.0, 1.0, vignette);
                
                gl_FragColor = vec4(finalColor * vignette, 1.0);
            }
        `,
        side: BackSide,
        transparent: false
    }), []);

    useFrame((state) => {
        if (!meshRef.current) return;
        
        const store = useStore.getState();
        const totalDistance = (store as any).totalDistance ?? 0;
        
        // --- SLIDING WINDOW ---
        const startZ = -400; 
        const totalLength = TUNNEL_SEGMENTS * SEGMENT_LENGTH;
        
        for (let i = 0; i < TUNNEL_SEGMENTS; i++) {
            const baseZ = startZ + (i * SEGMENT_LENGTH);
            let relativeZ = ((baseZ + totalDistance) % totalLength + totalLength) % totalLength - (totalLength / 2);
            dummy.position.set(0, 0, relativeZ);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        
        // --- UNIFORM SYNC ---
        const u = material.uniforms;
        if (u.uTime) u.uTime.value = state.clock.getElapsedTime();
        if (u.uScrollOffset) u.uScrollOffset.value = totalDistance;
        if (u.uTransitionProgress) u.uTransitionProgress.value = transitionProgress.current;
        if (u.uColor1) u.uColor1.value.copy(colors.primary);
        if (u.uColor2) u.uColor2.value.copy(colors.secondary);
        if (u.uAccent) u.uAccent.value.copy(colors.accent);
        if (u.uPulseSpeed) u.uPulseSpeed.value = biomeData.speed || 1;
        if (u.uWaveIntensity) u.uWaveIntensity.value = biomeData.intensity || 0.1;
    });

    useEffect(() => {
        return () => {
            geo.dispose();
            material.dispose();
        }
    }, [geo, material]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[geo, material, TUNNEL_SEGMENTS]}
            frustumCulled={false}
        />
    );
};


