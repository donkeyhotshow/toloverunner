/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Texture Optimizer - Оптимізація текстур для GPU
 * 
 * Features:
 * - Automatic mipmap generation
 * - GPU compression support detection
 * - Anisotropic filtering configuration
 * - Texture atlas utilities
 */

import * as THREE from 'three';
import { getDeviceCapabilities } from '../../utils/deviceDetect';

export interface TextureOptimizationConfig {
    /** Generate mipmaps for all textures */
    generateMipmaps: boolean;
    /** Anisotropic filtering level (0 = disabled, higher = better quality) */
    anisotropicFiltering: number;
    /** Use compressed textures if available */
    useCompressedTextures: boolean;
    /** Texture color space (Three.js r152+ uses ColorSpace) */
    encoding: THREE.ColorSpace;
    /** Max texture size (0 = auto) */
    maxTextureSize: number;
    /** Min filter for mipmap generation */
    minFilter: THREE.TextureFilter;
    /** Mag filter */
    magFilter: THREE.MagnificationTextureFilter;
}

const DEFAULT_CONFIG: TextureOptimizationConfig = {
    generateMipmaps: true,
    anisotropicFiltering: 4,
    useCompressedTextures: false, // Disabled by default, enable when .ktx2/.basis available
    encoding: THREE.SRGBColorSpace,
    maxTextureSize: 0, // Auto
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter as THREE.MagnificationTextureFilter,
};

export class TextureOptimizer {
    private config: TextureOptimizationConfig;
    private deviceCapabilities = getDeviceCapabilities();

    constructor(config: Partial<TextureOptimizationConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        
        // Adjust config based on device capabilities
        this.adjustForDevice();
    }

    /**
     * Adjust optimization settings based on device capabilities
     */
    private adjustForDevice(): void {
        // Reduce anisotropic filtering on mobile
        if (this.deviceCapabilities.isMobile) {
            this.config.anisotropicFiltering = 2;
            this.config.generateMipmaps = true;
        }

        // Reduce texture size on low-end devices
        if (this.deviceCapabilities.isLowEndDevice) {
            this.config.maxTextureSize = 1024;
            this.config.anisotropicFiltering = 1;
        }

        // Check max texture size support
        const maxSupportedSize = this.deviceCapabilities.maxTextureSize;
        if (this.config.maxTextureSize === 0 || this.config.maxTextureSize > maxSupportedSize) {
            this.config.maxTextureSize = maxSupportedSize;
        }
    }

    /**
     * Optimize a texture with proper settings
     */
    optimizeTexture(texture: THREE.Texture): THREE.Texture {
        // Generate mipmaps
        if (this.config.generateMipmaps) {
            texture.generateMipmaps = true;
            texture.minFilter = this.config.minFilter;
        } else {
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
        }

        // Set mag filter
        texture.magFilter = this.config.magFilter;

        // Anisotropic filtering
        if (this.config.anisotropicFiltering > 0) {
            texture.anisotropy = Math.min(
                this.config.anisotropicFiltering,
                this.deviceCapabilities.maxTextureSize
            );
        }

        // Apply encoding
        texture.colorSpace = this.config.encoding;

        // Set wrap mode
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        // Mark for update
        texture.needsUpdate = true;

        return texture;
    }

    /**
     * Optimize texture for UI (non-repeating, no mipmaps)
     */
    optimizeUITexture(texture: THREE.Texture): THREE.Texture {
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.colorSpace = this.config.encoding;
        texture.needsUpdate = true;

        return texture;
    }

    /**
     * Optimize texture for particles (non-filtered)
     */
    optimizeParticleTexture(texture: THREE.Texture): THREE.Texture {
        texture.generateMipmaps = false;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 1;
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.needsUpdate = true;

        return texture;
    }

    /**
     * Check if compressed textures (.ktx2, .basis) are supported
     */
    checkCompressedTextureSupport(): { ktx2: boolean; basis: boolean } {
        const gl = document.createElement('canvas').getContext('webgl2');
        
        if (!gl) {
            return { ktx2: false, basis: false };
        }

        const ktx2Supported = gl.getExtension('WEBGL_compressed_texture_ktx2');
        const basisSupported = gl.getExtension('WEBGL_texture_basis_l') || 
                              gl.getExtension('EXT_texture_compression_bptc');

        return {
            ktx2: !!ktx2Supported,
            basis: !!basisSupported
        };
    }

    /**
     * Get optimal render target settings for current device
     */
    getOptimalRenderTargetSettings(): {
        format: THREE.PixelFormat;
        type: THREE.TextureDataType;
        depthBuffer: boolean;
        stencilBuffer: boolean;
    } {
        return {
            format: THREE.RGBAFormat,
            type: this.deviceCapabilities.isLowEndDevice
                ? THREE.UnsignedByteType
                : THREE.HalfFloatType,
            depthBuffer: true,
            stencilBuffer: false,
        };
    }

    /**
     * Get current configuration
     */
    getConfig(): TextureOptimizationConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<TextureOptimizationConfig>): void {
        this.config = { ...this.config, ...config };
        this.adjustForDevice();
    }

    /**
     * Get device info for debugging
     */
    getDeviceInfo(): {
        isMobile: boolean;
        isLowEnd: boolean;
        maxTextureSize: number;
        hasWebGL2: boolean;
        anisotropy: number;
    } {
        return {
            isMobile: this.deviceCapabilities.isMobile,
            isLowEnd: this.deviceCapabilities.isLowEndDevice,
            maxTextureSize: this.deviceCapabilities.maxTextureSize,
            hasWebGL2: this.deviceCapabilities.hasWebGL2,
            anisotropy: this.config.anisotropicFiltering,
        };
    }
}

// Singleton instance
let textureOptimizer: TextureOptimizer | null = null;

/**
 * Get global texture optimizer
 */
export function getTextureOptimizer(config?: Partial<TextureOptimizationConfig>): TextureOptimizer {
    if (!textureOptimizer) {
        textureOptimizer = new TextureOptimizer(config);
    }
    return textureOptimizer;
}

/**
 * Reset texture optimizer
 */
export function resetTextureOptimizer(): void {
    textureOptimizer = null;
}

/**
 * Create optimized texture from canvas/image
 */
export function createOptimizedTexture(
    source: HTMLCanvasElement | HTMLImageElement,
    options: {
        type?: 'default' | 'ui' | 'particle';
        flipY?: boolean;
    } = {}
): THREE.Texture {
    const texture = new THREE.Texture(source);
    const optimizer = getTextureOptimizer();

    if (options.type === 'ui') {
        optimizer.optimizeUITexture(texture);
    } else if (options.type === 'particle') {
        optimizer.optimizeParticleTexture(texture);
    } else {
        optimizer.optimizeTexture(texture);
    }

    if (options.flipY !== undefined) {
        texture.flipY = options.flipY;
    }

    texture.needsUpdate = true;
    return texture;
}