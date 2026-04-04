import { Color } from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// 🧪 TOON NUCLEUS SHADER - MATTE COMIC STYLE
// Hard edges, no glow, comic print effect
const ToonNucleusMaterial = shaderMaterial(
  {
    uColor: new Color('#1a1a1a'), // Dark nucleus core
    uGlowColor: new Color('#8B7355'), // MATTE Brown (not neon cyan)
    uRimPower: 3.0, // Harder falloff
    uTime: 0,
    uEmissiveIntensity: 0.8,
  },
  // VERTEX SHADER
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // FRAGMENT SHADER
  `
    // Use mediump for better mobile performance
    precision mediump float;

    // Performance defines - MATTE COMIC STYLE
    #define USE_GLOW 0
    #define USE_EMISSIVE 0
    #define USE_RIM 1

    uniform vec3 uColor;
    uniform vec3 uGlowColor;
    uniform float uRimPower;
    uniform highp float uTime;
    uniform float uEmissiveIntensity;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // HARD COMIC FRESNEL - sharp edge only
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uRimPower);
      fresnel = step(0.4, fresnel); // Hard cutoff
      
      // Core (Center)
      float core = max(dot(viewDir, normal), 0.0);
      core = step(0.7, core); // Hard core

      // Mix Core and Shell - MATTE colors
      vec3 finalColor = mix(uGlowColor, uColor, core);
      
      // Add hard rim
      finalColor = mix(finalColor, uGlowColor * 1.2, fresnel * 0.5);

      // Subtle pulse - not glowing
      float pulse = sin(uTime * 3.0) * 0.05 + 0.95;
      finalColor *= pulse * uEmissiveIntensity;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ ToonNucleusMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      toonNucleusMaterial: Record<string, unknown>; // R3F extended material props
    }
  }
}

export { ToonNucleusMaterial };
