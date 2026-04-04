/**
 * WorldBendingShader - Curvature effect для "загибания" мира
 * 
 * Применяет эффект загиба мира вниз по мере удаления от камеры.
 * Используется для скрытия спавна объектов и создания ощущения движения внутри трубы.
 */

import { Material, Color, ShaderMaterial } from 'three';

/** Shader object passed to onBeforeCompile (Three.js internal) */
interface ShaderObject {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, { value: unknown }>;
}

/** Material с опциональным onBeforeCompile под нашу сигнатуру (базовый Material имеет свою). */
type PatchableMaterial = Material & { onBeforeCompile?: (shader: ShaderObject) => void };

let cachedIsMobile: boolean | null = null;
const getIsMobile = (): boolean => {
    if (cachedIsMobile !== null) return cachedIsMobile;
    if (typeof window === 'undefined') {
        cachedIsMobile = false;
        return cachedIsMobile;
    }
    cachedIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
    return cachedIsMobile;
};

export interface WorldBendingOptions {
    curvature?: number; // Сила загиба (default: 0.005)
    enabled?: boolean;
    halftone?: boolean;      // 🎨 VQC: Включить комиксный halftone (точки в тенях)
    halftoneScale?: number;  // Размер точек
    halftoneFreq?: number;   // Частота точек
}

/**
 * Применяет World Bending и Comic Halftone к материалу через onBeforeCompile
 */
export function applyWorldBending(
    material: Material,
    options: WorldBendingOptions = {}
): void {
    const {
        curvature = 0.005,
        enabled = true,
        halftone = true, // По умолчанию включено для Bio-Comic стиля
        halftoneScale = 0.6,
        halftoneFreq = 60.0
    } = options;

    if (!enabled) return;

    // 📱 MOBILE OPTIMIZATION: Reduce halftone intensity on mobile devices
    const isMobile = getIsMobile();

    const adaptiveHalftoneScale = isMobile ? halftoneScale * 0.3 : halftoneScale; // 30% intensity on mobile
    const adaptiveHalftoneFreq = isMobile ? halftoneFreq * 1.5 : halftoneFreq; // Larger dots on mobile

    // Патчим материалы с onBeforeCompile
    const patchableMaterial = material as PatchableMaterial;

    const onBeforeCompile = (shader: ShaderObject) => {
        applyShaderPatch(shader, curvature, {
            halftone,
            halftoneScale: adaptiveHalftoneScale,
            halftoneFreq: adaptiveHalftoneFreq
        });
    };

    if (!patchableMaterial.onBeforeCompile) {
        patchableMaterial.onBeforeCompile = onBeforeCompile;
    } else {
        const original = patchableMaterial.onBeforeCompile;
        patchableMaterial.onBeforeCompile = (shader: ShaderObject) => {
            original(shader);
            onBeforeCompile(shader);
        };
    }

    // Помечаем материал для перекомпиляции
    patchableMaterial.needsUpdate = true;
}

function applyShaderPatch(
    shader: ShaderObject,
    curvature: number,
    options: { halftone: boolean; halftoneScale: number; halftoneFreq: number }
): void {
    const { halftone, halftoneScale, halftoneFreq } = options;
    if (!shader || typeof shader.vertexShader !== 'string' || typeof shader.fragmentShader !== 'string') return;
    if (shader.vertexShader.includes('Start of Custom Bending Patch')) return;

    // Добавляем uniform для управления эффектом
    shader.uniforms = shader.uniforms || {};
    shader.uniforms.uCurvature = { value: curvature };

    if (halftone) {
        shader.uniforms.uHalftoneScale = { value: halftoneScale };
        shader.uniforms.uHalftoneFreq = { value: halftoneFreq };
    }

    // 1. Патчим vertex shader (Bending)
    // Мы полностью заменяем <project_vertex>, чтобы корректно обновить mvPosition для освещения
    // 1. Патчим vertex shader (Bending)
    // Correctly handle Instancing + Bending
    const vertexToken = '#include <project_vertex>';
    if (shader.vertexShader.includes(vertexToken)) {
        shader.vertexShader = shader.vertexShader.replace(
            vertexToken,
            `
            // Start of Custom Bending Patch
            vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
            
            #ifdef USE_INSTANCING
                worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
            #endif

            float distFromCamera = worldPos.z - cameraPosition.z;
            highp float curvatureFactor = ${curvature.toFixed(6)};
            
            // Apply World Bending (High Precision)
            // Use squared distance for parabolic bending
            highp float bendY = distFromCamera * distFromCamera * curvatureFactor;
            worldPos.y -= bendY;
            
            // Standard View & Projection
            vec4 mvPosition = viewMatrix * worldPos;
            gl_Position = projectionMatrix * mvPosition;
            // End of Custom Bending Patch
            `
        );
    }

    // 2. Патчим fragment shader (Halftone dots in shadows)
    if (halftone) {
        // Inject uniforms at a safe place (after common)
        const commonToken = '#include <common>';
        if (shader.fragmentShader.includes(commonToken)) {
            shader.fragmentShader = shader.fragmentShader.replace(
                commonToken,
                `
            #include <common>
            uniform highp float uHalftoneScale;
            uniform highp float uHalftoneFreq;
            `
            );
        }

        const ditheringToken = '#include <dithering_fragment>';
        if (shader.fragmentShader.includes(ditheringToken)) {
            shader.fragmentShader = shader.fragmentShader.replace(
                ditheringToken,
                `
            #include <dithering_fragment>
            
            // 🎨 VQC: Comic Halftone Effect
            // Накладываем точки в зависимости от яркости финального цвета
            float b = (gl_FragColor.r * 0.299 + gl_FragColor.g * 0.587 + gl_FragColor.b * 0.114);
            
            // Если пиксель в тени (< 0.8 яркости)
            if (b < 0.8) {
                // Screen-space halftone
                vec2 uv = gl_FragCoord.xy / uHalftoneFreq;
                vec2 nearest = floor(uv) + 0.5;
                float dist = distance(uv, nearest);
                
                // Размер точки растет в более темных местах
                float radius = (1.0 - b) * uHalftoneScale;
                float pattern = step(dist, radius);
                
                // Затемняем точки
                gl_FragColor.rgb *= (1.0 - pattern * 0.4);
            }
            `
            );
        }
    }
}

/**
 * Создает ShaderMaterial с встроенным World Bending
 */
export function createBendingMaterial(
    baseColor: string | Color,
    options: WorldBendingOptions & {
        emissive?: string | Color;
        emissiveIntensity?: number;
        roughness?: number;
        metalness?: number;
    } = {}
): ShaderMaterial {
    const {
        curvature = 0.005,
        emissive = '#000000',
        emissiveIntensity = 0
    } = options;

    const color = new Color(baseColor);
    const emissiveColor = new Color(emissive);

    return new ShaderMaterial({
        uniforms: {
            uColor: { value: color },
            uEmissive: { value: emissiveColor },
            uEmissiveIntensity: { value: emissiveIntensity },
            uCurvature: { value: curvature },
            uTime: { value: 0 }
        },
        vertexShader: `
            uniform float uCurvature;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                
                // World space position
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                
                // Apply bending
                float distFromCamera = worldPos.z - cameraPosition.z;
                worldPos.y -= distFromCamera * distFromCamera * uCurvature;
                
                // View space
                vec4 mvPosition = viewMatrix * worldPos;
                vViewPosition = -mvPosition.xyz;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            uniform vec3 uEmissive;
            uniform float uEmissiveIntensity;
            
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                // Simple toon-like shading
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewPosition);
                
                // Basic diffuse
                float diffuse = max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
                
                // Rim light for organic feel
                float rim = 1.0 - max(dot(viewDir, normal), 0.0);
                rim = pow(rim, 3.0);
                
                vec3 finalColor = uColor * (0.5 + diffuse * 0.5);
                finalColor += uEmissive * uEmissiveIntensity;
                finalColor += vec3(1.0) * rim * 0.2;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `
    });
}

export default {
    applyWorldBending,
    createBendingMaterial
};
