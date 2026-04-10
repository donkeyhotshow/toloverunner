/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * roadShaders — Bio-organic road shader code
 * Vertex: flat geometry (Y=0), no displacement
 * Fragment: organic stripes, cellular noise, fresnel, pulsing
 *
 * Mobile fallback (roadFragmentShaderMobile) uses mediump precision and
 * skips expensive cellular/fbm passes to avoid black screens on older GPUs.
 */

export const roadVertexShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;

    // NO VERTEX DISPLACEMENT — Road must remain mathematically flat
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const roadFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uOffset;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uAccent;
  uniform float uPulseSpeed;
  uniform float uWaveIntensity;
  uniform float uStripeFrequency;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;

  // Pseudo-random hash
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // Value noise
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Cellular / Voronoi noise for organic cell-like texture
  float cellular(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float minDist = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = vec2(hash(i + neighbor), hash(i + neighbor + vec2(31.0, 17.0)));
        vec2 diff = neighbor + point - f;
        float dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
    return minDist;
  }

  // Fractal Brownian Motion for layered texture
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * vnoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  // Fresnel-like rim effect
  float fresnelRim(vec2 uv) {
    float edgeX = 1.0 - abs(uv.x - 0.5) * 2.0;
    return pow(edgeX, 2.0);
  }

  void main() {
    // --- UV with MODULO 1000 scroll animation (SMOOTH 0→1000 cycle) ---
    vec2 uv = vUv;
    
    // Modulo 1000 for seamless cycling
    float scrollY = mod(uOffset * 0.01, 1000.0);
    uv.y += scrollY * 0.001;

    // --- Longitudinal stripes (organic movement feel) ---
    float wave = sin(uv.y * uStripeFrequency * 3.14159 + uTime * 0.5) * uWaveIntensity * 0.02;
    float stripe = step(0.5, fract((uv.y + wave) * uStripeFrequency));
    float stripe2 = step(0.5, fract((uv.y * 1.5 + wave * 1.3 + 0.25) * uStripeFrequency));

    // --- Cellular noise for biological texture ---
    float cells = cellular(uv * 12.0);
    float cells2 = cellular(uv * 24.0 + uTime * 0.05);

    // --- FBM for layered organic detail ---
    float organicDetail = fbm(uv * 8.0 + uTime * 0.03);

    // --- Bioluminescent pulse (heartbeat rhythm) ---
    float pulse = sin(uTime * uPulseSpeed) * 0.5 + 0.5;
    float pulse2 = sin(uTime * uPulseSpeed * 1.3 + 1.0) * 0.5 + 0.5;
    float combinedPulse = mix(pulse, pulse2, 0.5) * 0.15 + 0.85;

    // --- Color mixing ---
    vec3 baseColor = mix(uColor1, uColor2, stripe * 0.6 + cells * 0.4);
    baseColor = mix(baseColor, uAccent, stripe2 * 0.15 + cells2 * 0.1);

    // Apply organic detail
    baseColor *= 0.85 + organicDetail * 0.3;

    // Apply cellular texture
    baseColor *= 0.9 + cells2 * 0.2;

    // Apply pulse
    baseColor *= combinedPulse;

    // --- Depth gradient (darker toward far end for perspective) ---
    float depth = 1.0 - vUv.y * 0.4;
    baseColor *= depth;

    // --- Wet surface fresnel (glossy slime) ---
    float rim = fresnelRim(vUv);
    float wetFresnel = pow(rim, 3.0) * 0.25;
    baseColor += uAccent * wetFresnel;

    // --- Specular highlight (glossy reflection) ---
    vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfVec), 0.0), 64.0) * 0.3;
    baseColor += vec3(1.0, 0.95, 1.0) * spec;

    // --- Edge darkening for depth perception ---
    float edgeX = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    baseColor *= edgeX * 0.6 + 0.4;

    // --- Micro noise for slime grain ---
    float microNoise = hash(uv * 60.0 + uTime * 0.2) * 0.06;
    baseColor += microNoise;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// ── Mobile / low-end GPU fallback shaders ────────────────────────────────────
// Uses mediump precision and avoids loops/cellular noise that cause black
// screens on Mali-400, Adreno 3xx, and other older mobile GPUs.

export const roadFragmentShaderMobile = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform float uOffset;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uAccent;
  uniform float uPulseSpeed;
  uniform float uWaveIntensity;
  uniform float uStripeFrequency;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float scrollY = mod(uOffset * 0.01, 1000.0);
    uv.y += scrollY * 0.001;

    // Simple stripe — no cellular, no fbm
    float wave = sin(uv.y * uStripeFrequency * 3.14159 + uTime * 0.5) * uWaveIntensity * 0.02;
    float stripe = step(0.5, fract((uv.y + wave) * uStripeFrequency));

    float pulse = sin(uTime * uPulseSpeed) * 0.075 + 0.925;

    vec3 baseColor = mix(uColor1, uColor2, stripe * 0.6);
    baseColor *= pulse;

    // Edge darkening
    float edgeX = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
    baseColor *= edgeX * 0.6 + 0.4;

    // Micro noise (single sample — cheap)
    float microNoise = hash(uv * 60.0 + uTime * 0.2) * 0.04;
    baseColor += microNoise;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

/**
 * Detects whether the current device should use the mobile fallback shader.
 * Checks for low-end GPU signatures via WebGL renderer string.
 */
export function shouldUseMobileShader(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return true; // No WebGL at all — use simplest path
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    const lower = renderer.toLowerCase();
    // Known problematic GPU families
    return (
      lower.includes('mali-4') ||
      lower.includes('mali-3') ||
      lower.includes('adreno 3') ||
      lower.includes('adreno 2') ||
      lower.includes('powervr sgx') ||
      lower.includes('videocore')
    );
  } catch {
    return false;
  }
}
