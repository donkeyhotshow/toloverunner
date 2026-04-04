/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Enhanced Toon Shader - Cell Shading System
 * 
 * Особливості:
 * - Cell shading з налаштовуваною кількістю зон
 * - Rim lighting для читаємості силуету
 * - Адаптивні налаштування для мобільних пристроїв
 * - Підтримка gradient map
 */

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, Object3DNode } from '@react-three/fiber';

// Параметри для toon матеріалу
export interface ToonMaterialParams {
  color?: THREE.ColorRepresentation;
  gradientMap?: THREE.Texture | null;
  rimColor?: THREE.ColorRepresentation;
  rimPower?: number;
  rimIntensity?: number;
  cellBands?: number;
  lightDirection?: THREE.Vector3;
  ambient?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  time?: number;
}

// Пресети для різних типів об'єктів
export const TOON_SHADER_PRESETS = {
  PLAYER: {
    cellBands: 4,
    rimPower: 2.5,
    rimIntensity: 1.2,
    ambient: 0.35,
    emissive: '#000000',
    emissiveIntensity: 0
  },
  OBSTACLE: {
    cellBands: 3,
    rimPower: 3.0,
    rimIntensity: 0.8,
    ambient: 0.4,
    emissive: '#000000',
    emissiveIntensity: 0
  },
  ENVIRONMENT: {
    cellBands: 3,
    rimPower: 4.0,
    rimIntensity: 0.5,
    ambient: 0.5,
    emissive: '#000000',
    emissiveIntensity: 0
  },
  COLLECTIBLE: {
    cellBands: 4,
    rimPower: 2.0,
    rimIntensity: 1.5,
    ambient: 0.3,
    emissive: '#ffff00',
    emissiveIntensity: 0.5
  },
  DANGER: {
    cellBands: 3,
    rimPower: 2.5,
    rimIntensity: 1.0,
    ambient: 0.35,
    emissive: '#ff0000',
    emissiveIntensity: 0.3
  }
} as const;

// Створення Enhanced Toon Material
export const createEnhancedToonMaterial = (params: ToonMaterialParams): THREE.ShaderMaterial => {
  const {
    color = '#ffffff',
    gradientMap = null,
    rimColor = '#ff69b4',
    rimPower = 3.0,
    rimIntensity = 1.0,
    cellBands = 3,
    lightDirection = new THREE.Vector3(0.5, 1, 0.5).normalize(),
    ambient = 0.4,
    emissive = '#000000',
    emissiveIntensity = 0,
    time = 0
  } = params;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uGradientMap: { value: gradientMap },
      uRimColor: { value: new THREE.Color(rimColor) },
      uRimPower: { value: rimPower },
      uRimIntensity: { value: rimIntensity },
      uCellBands: { value: cellBands },
      uLightDirection: { value: lightDirection.clone() },
      uAmbient: { value: ambient },
      uEmissive: { value: new THREE.Color(emissive) },
      uEmissiveIntensity: { value: emissiveIntensity },
      uTime: { value: time }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision mediump float;
      
      uniform vec3 uColor;
      uniform sampler2D uGradientMap;
      uniform vec3 uRimColor;
      uniform float uRimPower;
      uniform float uRimIntensity;
      uniform int uCellBands;
      uniform vec3 uLightDirection;
      uniform float uAmbient;
      uniform vec3 uEmissive;
      uniform float uEmissiveIntensity;
      uniform float uTime;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      
      // Cell shading function
      float cellShade(float intensity) {
        float band = 1.0 / float(uCellBands);
        return floor(intensity / band) * band;
      }
      
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        
        // Basic lighting - Half-Lambert
        float NdotL = dot(normal, uLightDirection);
        float lightIntensity = NdotL * 0.5 + 0.5;
        
        // Cell shading
        float celIntensity = cellShade(lightIntensity);
        
        // Use gradient map if available
        vec3 shadingColor = uColor;
        if (uGradientMap != null) {
          float gradientSample = texture2D(uGradientMap, vec2(celIntensity, 0.0)).r;
          shadingColor = mix(shadingColor, shadingColor * gradientSample * 2.0, 0.5);
        }
        
        // Fresnel rim lighting
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uRimPower);
        
        // Base color with lighting
        vec3 finalColor = shadingColor * (uAmbient + celIntensity * (1.0 - uAmbient));
        
        // Add rim lighting
        finalColor = mix(finalColor, uRimColor, fresnel * uRimIntensity);
        
        // Add emissive
        finalColor += uEmissive * uEmissiveIntensity;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });
};

// React Three Fiber Shader Material
export const EnhancedToonMaterial = shaderMaterial(
  {
    uColor: new THREE.Color('#ffffff'),
    uGradientMap: null,
    uRimColor: new THREE.Color('#ff69b4'),
    uRimPower: 3.0,
    uRimIntensity: 1.0,
    uCellBands: 3,
    uLightDirection: new THREE.Vector3(0.5, 1, 0.5).normalize(),
    uAmbient: 0.4,
    uEmissive: new THREE.Color('#000000'),
    uEmissiveIntensity: 0,
    uTime: 0
  },
  // Vertex Shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    precision mediump float;
    
    uniform vec3 uColor;
    uniform sampler2D uGradientMap;
    uniform vec3 uRimColor;
    uniform float uRimPower;
    uniform float uRimIntensity;
    uniform int uCellBands;
    uniform vec3 uLightDirection;
    uniform float uAmbient;
    uniform vec3 uEmissive;
    uniform float uEmissiveIntensity;
    uniform highp float uTime;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    float cellShade(float intensity) {
      float band = 1.0 / float(uCellBands);
      return floor(intensity / band) * band;
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      
      float NdotL = dot(normal, uLightDirection);
      float lightIntensity = NdotL * 0.5 + 0.5;
      
      float celIntensity = cellShade(lightIntensity);
      
      vec3 shadingColor = uColor;
      
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uRimPower);
      
      vec3 finalColor = shadingColor * (uAmbient + celIntensity * (1.0 - uAmbient));
      finalColor = mix(finalColor, uRimColor, fresnel * uRimIntensity);
      finalColor += uEmissive * uEmissiveIntensity;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

// Extend для JSX
extend({ EnhancedToonMaterial });

// TypeScript declarations
declare global {
  namespace JSX {
    interface IntrinsicElements {
      enhancedToonMaterial: Object3DNode<THREE.ShaderMaterial, typeof EnhancedToonMaterial> & {
        color?: THREE.ColorRepresentation;
        gradientMap?: THREE.Texture | null;
        rimColor?: THREE.ColorRepresentation;
        rimPower?: number;
        rimIntensity?: number;
        cellBands?: number;
        lightDirection?: THREE.Vector3;
        ambient?: number;
        emissive?: THREE.ColorRepresentation;
        emissiveIntensity?: number;
        time?: number;
      };
    }
  }
}

// Gradient Map Generator - створює gradient texture для toon shading
export const createGradientMap = (bands: number = 3): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = bands;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  const gradient = ctx.createLinearGradient(0, 0, bands, 0);
  gradient.addColorStop(0, '#333333');
  
  for (let i = 1; i < bands; i++) {
    const stop = i / bands;
    const color = Math.floor(stop * 255);
    gradient.addColorStop(stop, `rgb(${color}, ${color}, ${color})`);
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, bands, 1);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  
  return texture;
};

// Палітра кольорів для біологічного стилю
export const BIO_COLORS = {
  PLAYER: {
    primary: '#FFF8F0',      // Світлий кремовий
    secondary: '#FFCC99',    // Шия/хвіст
    rim: '#FFB6C1',          // Рожевий rim
    emissive: '#FFFFFF'
  },
  OBSTACLE_VIRUS: {
    primary: '#FF6B6B',      // Червоний
    secondary: '#CC0000',    // Темно-червоний
    rim: '#FF0000',
    emissive: '#FF0000'
  },
  OBSTACLE_WALL: {
    primary: '#4ECDC4',      // Бірюзовий
    secondary: '#2C7873',    // Темно-бірюзовий
    rim: '#45B7D1',
    emissive: '#000000'
  },
  COLLECTIBLE_COIN: {
    primary: '#FFE66D',      // Жовтий
    secondary: '#FFD93D',    // Темно-жовтий
    rim: '#FFFF00',
    emissive: '#FFFF00'
  },
  COLLECTIBLE_POWERUP: {
    primary: '#C44DFF',      // Фіолетовий
    secondary: '#9B59B6',    // Темно-фіолетовий
    rim: '#E056FD',
    emissive: '#C44DFF'
  }
} as const;

// Color interpolation helper
export const lerpColor = (color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color => {
  return new THREE.Color().lerpColors(color1, color2, t);
};

export default EnhancedToonMaterial;