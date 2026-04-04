/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * BakedTextureGenerator - Pre-generate organic textures once at startup
 * Creates high-quality 2048x2048 textures with veins, cells, and noise
 * Performance: Runs ONCE instead of every frame
 */

import * as THREE from 'three';

export class BakedTextureGenerator {
    private static textureCache = new Map<string, THREE.Texture>();

    /**
     * Generate or retrieve cached organic tissue texture
     */
    static getOrganicTissue(type: 'wall' | 'floor' | 'ceiling', size = 2048): THREE.Texture {
        const cacheKey = `organic_${type}_${size}`;

        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey)!;
        }

        const texture = this.generateOrganicTexture(type, size);
        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    private static generateOrganicTexture(type: string, size: number): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Base color gradient
        const baseColors = {
            wall: ['#ff5555', '#ff8888', '#ffaaaa'],
            floor: ['#ff9999', '#ffcccc', '#ff9999'],
            ceiling: ['#ff7777', '#ffaaaa', '#ff7777'],
        }[type] || ['#ff9999', '#ffcccc', '#ff9999'];

        const grd = ctx.createLinearGradient(0, 0, size, size);
        grd.addColorStop(0, baseColors[0] ?? '#ff9999');
        grd.addColorStop(0.5, baseColors[1] ?? '#ffcccc');
        grd.addColorStop(1, baseColors[2] ?? '#ff9999');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, size, size);

        // Perlin-like noise layer
        this.addNoise(ctx, size, 0.3);

        // Veins / Capillaries
        this.addVeins(ctx, size, 50);

        // Cells / Organelles
        this.addCells(ctx, size, 2000);

        // Muscle fibers (for floor)
        if (type === 'floor') {
            this.addMuscleFibers(ctx, size, 100);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 16;
        texture.colorSpace = THREE.SRGBColorSpace;

        return texture;
    }

    private static addNoise(ctx: CanvasRenderingContext2D, size: number, _alpha: number) {
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        if (!data) return;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 60;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r !== undefined) data[i] = r + noise;
            if (g !== undefined) data[i + 1] = g + noise;
            if (b !== undefined) data[i + 2] = b + noise;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    private static addVeins(ctx: CanvasRenderingContext2D, size: number, count: number) {
        ctx.strokeStyle = 'rgba(255, 40, 40, 0.6)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        for (let i = 0; i < count; i++) {
            ctx.beginPath();
            const x = Math.random() * size;
            const y = Math.random() * size;
            ctx.moveTo(x, y);

            // Bezier curve for organic look
            for (let j = 0; j < 3; j++) {
                const cpx1 = x + (Math.random() - 0.5) * 200;
                const cpy1 = y + (Math.random() - 0.5) * 200;
                const cpx2 = x + (Math.random() - 0.5) * 200;
                const cpy2 = y + (Math.random() - 0.5) * 200;
                const endX = x + (Math.random() - 0.5) * 300;
                const endY = y + (Math.random() - 0.5) * 300;
                ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, endX, endY);
            }
            ctx.stroke();
        }
    }

    private static addCells(ctx: CanvasRenderingContext2D, size: number, count: number) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 4 + 1;

            const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
            grd.addColorStop(1, 'rgba(255, 100, 100, 0)');

            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private static addMuscleFibers(ctx: CanvasRenderingContext2D, size: number, count: number) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';
        for (let i = 0; i < count; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const width = 4;
            const height = 30 + Math.random() * 50;
            ctx.fillRect(x, y, width, height);
        }
    }

    /**
     * Clear all cached textures (call on level restart)
     */
    static clearCache() {
        this.textureCache.forEach(texture => texture.dispose());
        this.textureCache.clear();
    }
}
