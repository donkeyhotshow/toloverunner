/**
 * wallShaders — Intestine wall shader
 * Organic fleshy pink walls with horizontal folds to match the tunnel
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

    // Subtle organic bulging (intestinal peristalsis)
    float bulge = sin(pos.y * 0.06 + uTime * 0.4) * uWaveIntensity * 0.5;
    pos.x += bulge;

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

  uniform vec3 uColor1;    // flesh pink
  uniform vec3 uColor2;    // lighter highlight
  uniform vec3 uColor3;    // warm accent
  uniform vec3 uAccent;    // highlight
  uniform vec3 uBioCyan;   // groove dark

  uniform float uPulseSpeed;
  uniform float uCellScale;
  uniform float uGlossiness;
  uniform float uFresnelPower;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float scrollY = mod(uOffset * 0.003, 100.0);
    uv.y += scrollY * 0.01;

    // === INTESTINAL HORIZONTAL FOLDS ===
    float foldFreq = 10.0;
    float fv = mod(uv.y * foldFreq, 1.0);
    float foldBulge = sin(fv * 3.14159);        // 0→1→0 per fold
    float foldBulge2 = pow(foldBulge, 1.5);      // sharper peaks
    float groove = 1.0 - smoothstep(0.0, 0.12, fv) * smoothstep(1.0, 0.88, fv);

    // === COLOR ===
    // Between groove (dark) and flesh (peak)
    vec3 baseColor = mix(uBioCyan, uColor1, foldBulge2);

    // Add highlight at peak
    baseColor = mix(baseColor, uColor2, foldBulge2 * 0.5);

    // Fresnel edge glow (inner edge of intestine wall)
    float fres = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), uFresnelPower);
    baseColor += uAccent * fres * 0.12;

    // Peristalsis pulse
    float pulse = sin(uTime * uPulseSpeed * 0.8 - vWorldPos.z * 0.05) * 0.04 + 0.96;
    baseColor *= pulse;

    // Height fade — darker at bottom, lighter at top
    float heightFade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    baseColor *= 0.6 + heightFade * 0.4;

    // Micro noise grain
    float n = hash(uv * 50.0 + uTime * 0.1) * 0.05;
    baseColor += n;

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;
