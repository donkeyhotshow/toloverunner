/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * OrganicRoadMaterial — Enhanced purple stripe road shader
 * STABILITY: Zero vertex displacement, UV scroll only via uTotalDistance
 * Enhanced: cellular noise, fresnel, specular, multi-layer stripes, bio pulse
 */

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const OrganicRoadMaterial = shaderMaterial(
  {
    uTime: 0,
    uOffset: 0,
    uSpeed: 10,
    uColor1: new THREE.Color('#4A1A6B'),
    uColor2: new THREE.Color('#6B2D8B'),
    uColor3: new THREE.Color('#C75BC4'),
    uAccent: new THREE.Color('#2A9D8F'),
    uBioCyan: new THREE.Color('#00F5D4'),
    uPulseSpeed: 1.5,
    uStripeFreq: 20.0,
    uCellScale: 10.0,
    uGlossiness: 0.6,
    uFresnelPower: 3.0,
    uWaveIntensity: 0.3,
  },
  // Vertex Shader — FLAT GEOMETRY for perfect physics stability
  `
    precision highp float;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    void main() {
      vUv = uv;

      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      // NO VERTEX DISPLACEMENT — Road geometry must remain mathematically flat
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment Shader — deterministic stripes with cellular noise
  `
    precision highp float;

    uniform float uTime;
    uniform float uOffset;
    uniform float uSpeed;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform vec3 uAccent;
    uniform vec3 uBioCyan;
    uniform float uPulseSpeed;
    uniform float uStripeFreq;
    uniform float uCellScale;
    uniform float uGlossiness;
    uniform float uFresnelPower;
    uniform float uWaveIntensity;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    // Hash-based noise
    float hash(vec2 p) {
      p = fract(p * vec2(443.8975, 397.2973));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    vec2 hash2(vec2 p) {
      p = vec2(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3))
      );
      return fract(sin(p) * 43758.5453123);
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 4; i++) {
        value += amplitude * valueNoise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    float voronoi(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float minDist = 1.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point = hash2(i + neighbor);
          point = 0.5 + 0.5 * sin(uTime * 0.3 + 6.2831 * point);
          vec2 diff = neighbor + point - f;
          minDist = min(minDist, length(diff));
        }
      }
      return minDist;
    }

    // Multi-layer longitudinal stripes
    float stripes(vec2 uv, float time) {
      float s1 = sin(uv.y * uStripeFreq + time * 2.0) * 0.5 + 0.5;
      float s2 = sin(uv.y * (uStripeFreq * 1.5) - time * 1.3) * 0.5 + 0.5;
      float s3 = sin(uv.y * (uStripeFreq * 0.7) + time * 0.8) * 0.5 + 0.5;
      float combined = s1 * 0.5 + s2 * 0.3 + s3 * 0.2;
      return smoothstep(0.3, 0.7, combined);
    }

    // Biological pulse (golden ratio frequency)
    float bioPulse(float time) {
      float p1 = sin(time * uPulseSpeed) * 0.5 + 0.5;
      float p2 = sin(time * (uPulseSpeed * 1.618) + 1.57) * 0.5 + 0.5;
      return mix(p1, p2, 0.5);
    }

    float fresnelEffect(vec3 viewDir, vec3 normal, float power) {
      float ndotv = max(dot(viewDir, normal), 0.0);
      return pow(1.0 - ndotv, power);
    }

    float specularHighlight(vec3 viewDir, vec3 normal, float shininess) {
      vec3 lightDir = normalize(vec3(0.0, 1.0, 0.5));
      vec3 halfDir = normalize(lightDir + viewDir);
      return pow(max(dot(normal, halfDir), 0.0), shininess);
    }

    float depthFade(vec2 uv) {
      float centerFade = 1.0 - abs(uv.x - 0.5) * 2.0;
      centerFade = smoothstep(0.0, 1.0, centerFade);
      float distFade = 1.0 - uv.y * 0.3;
      return centerFade * distFade;
    }

    void main() {
      vec2 uv = vUv;
      float scrollSpeed = uSpeed * 0.005;
      uv.y += uOffset * scrollSpeed;

      // Stripes
      float str = stripes(uv, uTime);

      // Cellular texture
      float cells = voronoi(uv * uCellScale);
      float cells2 = voronoi(uv * uCellScale * 2.0 + uTime * 0.05);

      // Pulse
      float pulse = bioPulse(uTime);

      // Organic FBM
      float organic = fbm(uv * 5.0 + uTime * 0.02);

      // Color mixing
      vec3 baseColor = mix(uColor1, uColor2, organic * 0.6 + str * 0.4);
      baseColor = mix(baseColor, uColor3, str * 0.35);
      baseColor *= 0.7 + cells * 0.6;
      baseColor *= 0.85 + pulse * 0.3;

      // Specular
      float spec = specularHighlight(vViewDir, vNormal, 64.0);
      vec3 specColor = mix(uAccent, uBioCyan, pulse) * spec * uGlossiness;

      // Fresnel
      float fres = fresnelEffect(vViewDir, vNormal, uFresnelPower);
      vec3 fresColor = mix(uAccent, uBioCyan, fres) * fres * 0.4;

      // Rim pulse
      float rimPulse = fres * pulse;
      vec3 rimColor = uBioCyan * rimPulse * 0.3;

      // Depth fade
      float fade = depthFade(uv);
      baseColor *= fade;

      // Micro noise
      float slime = mix(valueNoise(uv * 80.0 + uTime * 0.5), valueNoise(uv * 120.0 - uTime * 0.3), 0.5);
      baseColor *= 0.92 + slime * 0.16;

      // Final
      vec3 finalColor = baseColor + specColor + fresColor + rimColor;
      finalColor = mix(finalColor, uColor1 * 1.2, 0.08);
      finalColor = clamp(finalColor, 0.0, 1.0);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ OrganicRoadMaterial });

export type OrganicRoadMaterialType = InstanceType<typeof OrganicRoadMaterial>;

export { OrganicRoadMaterial };
