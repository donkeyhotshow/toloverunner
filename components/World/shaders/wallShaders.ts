/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * wallShaders — Bio-organic tunnel wall shader code
 * Vertex: organic displacement (walls ≠ road — bending allowed)
 * Fragment: drip patterns, rim lighting, dark depth
 */

export const wallVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uWaveIntensity;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;

    vec3 pos = position;

    // Organic wall curvature (vertex displacement allowed for walls)
    float wave = sin(pos.y * 0.05 + uTime * 0.5) * uWaveIntensity;
    float wave2 = sin(pos.y * 0.08 - uTime * 0.3) * uWaveIntensity * 0.5;
    pos.x += wave + wave2;

    // Height pulsation
    float heightPulse = sin(uTime * 1.2 + pos.y * 0.02) * 0.15;
    pos.z += heightPulse * pos.z;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const wallFragmentShader = /* glsl */ `
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
  uniform float uCellScale;
  uniform float uGlossiness;
  uniform float uFresnelPower;

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
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float voronoi(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = hash2(i + neighbor);
        point = 0.5 + 0.5 * sin(uTime * 0.2 + 6.2831 * point);
        vec2 diff = neighbor + point - f;
        minDist = min(minDist, length(diff));
      }
    }
    return minDist;
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * valueNoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  // Octagonal rings for tunnel structure
  float octagonRings(vec2 uv, float time) {
    float scroll = mod(uSpeed * 0.003 + time * 0.1, 1000.0);
    float ringY = uv.y + scroll * 0.01;
    
    // Create octagonal rings using 8-fold symmetry
    float angle = atan(uv.x - 0.5, uv.y - 0.5);
    float octagon = abs(sin(angle * 4.0));
    
    // Ring pattern
    float rings = sin(ringY * 40.0) * 0.5 + 0.5;
    float rings2 = sin(ringY * 80.0 + 1.57) * 0.5 + 0.5;
    
    // Combine with octagonal modulation
    float pattern = mix(rings, rings2, octagon * 0.3);
    
    return smoothstep(0.4, 0.6, pattern);
  }

  // Vertical drip pattern
  float drips(vec2 uv, float time) {
    float scroll = time * uSpeed * 0.003;
    float d1 = valueNoise(vec2(uv.x * 15.0, uv.y * 3.0 - scroll));
    float d2 = valueNoise(vec2(uv.x * 25.0 + 5.0, uv.y * 5.0 - scroll * 0.7));
    float drip = smoothstep(0.55, 0.65, d1) * 0.5;
    drip += smoothstep(0.6, 0.7, d2) * 0.3;
    return drip;
  }

  void main() {
    vec2 uv = vUv;
    float scrollSpeed = uSpeed * 0.004;
    uv.y += uOffset * scrollSpeed;

    // GUARD CLAUSE: Prevent uTime/offset issues
    float safeTime = uTime;
    if (uTime < 0.0 || uTime > 10000.0) {
      safeTime = mod(uTime, 10000.0);
    }

    // Cellular texture
    float cells = voronoi(uv * uCellScale);
    float cells2 = voronoi(uv * uCellScale * 1.5 + safeTime * 0.03);

    // Organic pattern
    float organic = fbm(uv * 4.0 + safeTime * 0.01);

    // OCTAGONAL RINGS with neon glow
    float octRings = octagonRings(uv, safeTime);

    // Drips
    float drip = drips(uv, safeTime);

    // Pulse with NEON GLOW
    float pulse = sin(safeTime * uPulseSpeed) * 0.5 + 0.5;
    float pulse2 = sin(safeTime * uPulseSpeed * 1.3 + 1.0) * 0.5 + 0.5;
    float combinedPulse = mix(pulse, pulse2, 0.5);

    // Neon glow effect on rings
    float neonGlow = octRings * (0.5 + combinedPulse * 0.5);
    neonGlow = pow(neonGlow, 1.5) * 1.5;

    // Color
    vec3 baseColor = mix(uColor1, uColor2, organic * 0.5 + cells * 0.5);
    baseColor *= 0.6 + cells2 * 0.5;
    baseColor *= 0.85 + combinedPulse * 0.15;

    // Apply octagonal rings with neon glow
    baseColor = mix(baseColor, uBioCyan, neonGlow * 0.4);
    baseColor += uAccent * neonGlow * 0.3; // Additive neon

    // Drips — brighter
    baseColor = mix(baseColor, uColor3, drip * 0.4);

    // Fresnel
    float fres = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), uFresnelPower);
    vec3 fresColor = uAccent * fres * 0.5;

    // Rim light toward tunnel center (NEON)
    float rim = pow(fres, 2.0) * pulse;
    vec3 rimColor = uBioCyan * rim * 0.5; // Brighter neon rim

    // Height fade — darker at top/bottom
    float heightFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    baseColor *= heightFade;

    // Micro noise
    float noise = valueNoise(uv * 60.0 + safeTime * 0.2);
    baseColor *= 0.9 + noise * 0.2;

    vec3 finalColor = baseColor + fresColor + rimColor;
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
