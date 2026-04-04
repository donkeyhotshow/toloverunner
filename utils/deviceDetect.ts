/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Device Detection - Визначення типу пристрою та GPU можливостей
 * для адаптивної якості графіки
 */

export interface DeviceCapabilities {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLowEndDevice: boolean;
    hasWebGL2: boolean;
    hasGoodGPU: boolean;
    maxTextureSize: number;
    deviceMemory: number; // GB
    hardwareConcurrency: number; // CPU cores
    screenPixelRatio: number;
    prefersReducedMotion: boolean;
}

/**
 * Визначити тип пристрою та його можливості
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
    if (typeof window === 'undefined') {
        return getDefaultCapabilities();
    }

    const ua = navigator.userAgent.toLowerCase();
    
    // Detect mobile/tablet
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isTablet = /ipad|android.*tablet/i.test(ua);
    const isDesktop = !isMobile && !isTablet;

    // Check for low-end indicators
    const isLowEndDevice = detectLowEndDevice(ua);

    // WebGL2 support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const hasWebGL2 = !!canvas.getContext('webgl2');
    
    // GPU detection
    const gpuInfo = getGPUInfo(gl);
    const hasGoodGPU = !isLowEndDevice && gpuInfo.isHighPerformance;

    // Memory (Chrome only)
    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 
        (isMobile ? 2 : 8);

    // CPU cores
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // Screen pixel ratio
    const screenPixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // Reduced motion preference
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

    return {
        isMobile,
        isTablet,
        isDesktop,
        isLowEndDevice,
        hasWebGL2,
        hasGoodGPU,
        maxTextureSize: gpuInfo.maxTextureSize,
        deviceMemory,
        hardwareConcurrency,
        screenPixelRatio,
        prefersReducedMotion
    };
}

/**
 * Визначити низькопродуктивний пристрій за ознаками
 */
function detectLowEndDevice(ua: string): boolean {
    // Check for known low-end indicators
    const lowEndIndicators = [
        /android.*low/i,
        /android.*m1/i,
        /adreno 3/i,
        /adreno 4[0-4]/i,
        /mali-4/i,
        /mali-t/i,
        /powervr sgx/i,
        /iphone.*([1-5]|se)/i,
        /ipad.*[1-3]/i,
    ];

    for (const pattern of lowEndIndicators) {
        if (pattern.test(ua)) return true;
    }

    // Check device memory if available
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory < 4) return true;

    // Check hardware concurrency
    if ((navigator.hardwareConcurrency || 4) < 4) return true;

    return false;
}

/**
 * Отримати інформацію про GPU
 */
function getGPUInfo(gl: WebGLRenderingContext | null): { 
    renderer: string; 
    vendor: string;
    maxTextureSize: number;
    isHighPerformance: boolean;
} {
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo 
        ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown'
        : 'unknown';
    const vendor = debugInfo
        ? gl?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown'
        : 'unknown';
    
    const maxTextureSize = gl?.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

    // Determine if GPU is high performance
    const highPerformanceGPUs = [
        'nvidia', 'geforce', 'rtx', 'gtx', 'quadro',
        'amd', 'radeon', 'rx ', 'firepro',
        'apple m1', 'apple m2', 'apple m3',
        'intel iris', 'intel xe',
    ];

    const isHighPerformance = highPerformanceGPUs.some(gpu => 
        renderer.toLowerCase().includes(gpu)
    ) && !renderer.toLowerCase().includes('intel hd');

    return { renderer, vendor, maxTextureSize, isHighPerformance };
}

/**
 * Отримати стандартні можливості для SSR
 */
function getDefaultCapabilities(): DeviceCapabilities {
    return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLowEndDevice: false,
        hasWebGL2: true,
        hasGoodGPU: true,
        maxTextureSize: 4096,
        deviceMemory: 8,
        hardwareConcurrency: 8,
        screenPixelRatio: 1,
        prefersReducedMotion: false
    };
}

// Cache for device capabilities
let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Отримати кешовані можливості пристрою
 */
export function getDeviceCapabilities(): DeviceCapabilities {
    if (!cachedCapabilities) {
        cachedCapabilities = detectDeviceCapabilities();
    }
    return cachedCapabilities;
}

/**
 * Очистити кеш можливостей пристрою
 */
export function clearDeviceCapabilitiesCache(): void {
    cachedCapabilities = null;
}