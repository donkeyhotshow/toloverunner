/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Texture Atlas Generator - Combine multiple textures into one for GPU batching
 */

import * as THREE from 'three';

interface AtlasEntry {
    name: string;
    uvOffset: [number, number];
    uvScale: [number, number];
}

export class TextureAtlas {
    public texture: THREE.Texture;
    public entries: Map<string, AtlasEntry> = new Map();
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(size: number = 512) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = size;
        this.canvas.height = size;
        this.ctx = this.canvas.getContext('2d')!;
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.wrapS = THREE.ClampToEdgeWrapping;
        this.texture.wrapT = THREE.ClampToEdgeWrapping;
    }

    /**
     * Add a texture to the atlas
     * @param name Unique identifier
     * @param imageData Image data or canvas
     * @param x Position X in atlas
     * @param y Position Y in atlas
     * @param width Width in atlas
     * @param height Height in atlas
     */
    addTexture(
        name: string,
        imageData: HTMLCanvasElement | ImageData,
        x: number,
        y: number,
        width: number,
        height: number
    ) {
        if (imageData instanceof HTMLCanvasElement) {
            this.ctx.drawImage(imageData, x, y, width, height);
        } else {
            this.ctx.putImageData(imageData, x, y);
        }

        const atlasSize = this.canvas.width;
        this.entries.set(name, {
            name,
            uvOffset: [x / atlasSize, y / atlasSize],
            uvScale: [width / atlasSize, height / atlasSize]
        });

        this.texture.needsUpdate = true;
    }

    /**
     * Get UV offset and scale for a texture
     */
    getUVTransform(name: string): { offset: [number, number]; scale: [number, number] } | null {
        const entry = this.entries.get(name);
        if (!entry) return null;
        return {
            offset: entry.uvOffset,
            scale: entry.uvScale
        };
    }

    /**
     * Create a procedural texture pattern
     */
    static createProceduralTexture(
        width: number,
        height: number,
        color: string,
        pattern: 'dots' | 'noise' | 'solid' | 'pipe' | 'comic_road' = 'solid'
    ): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);

        if (pattern === 'dots') {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for (let y = 0; y < height; y += 8) {
                for (let x = 0; x < width; x += 8) {
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (pattern === 'noise') {
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = Math.random() * 30 - 15;
                data[i] = (data[i] ?? 0) + noise;
                data[i + 1] = (data[i + 1] ?? 0) + noise;
                data[i + 2] = (data[i + 2] ?? 0) + noise;
            }
            ctx.putImageData(imageData, 0, 0);
        } else if (pattern === 'pipe' || pattern === 'comic_road') {
            // 🛣️ COMIC STYLE ROAD TEXTURE
            // Palette: Deep Indigo Base, Hot Pink Center, Cyan Edges

            // 1. Base Road Color
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#1A0B2E');   // Darker Indigo Edge
            gradient.addColorStop(0.3, '#2D1B4E'); // Lighter Indigo Body
            gradient.addColorStop(0.7, '#2D1B4E');
            gradient.addColorStop(1, '#1A0B2E');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // 2. Center Line (Hot Pink Dashed)
            ctx.strokeStyle = '#FF00CC'; // 🧬 Hot Pink
            ctx.lineWidth = width * 0.04;
            ctx.setLineDash([height * 0.15, height * 0.1]);
            ctx.shadowColor = '#FF00CC';
            ctx.shadowBlur = 10; // Glow effect
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(width / 2, height);
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset

            // 3. Side Lines (Cyan Solid)
            ctx.strokeStyle = '#00F0FF'; // ⚡ Electric Blue
            ctx.lineWidth = width * 0.03;
            ctx.setLineDash([]); // Solid

            // Left Line
            ctx.beginPath();
            ctx.moveTo(width * 0.05, 0);
            ctx.lineTo(width * 0.05, height);
            ctx.stroke();

            // Right Line
            ctx.beginPath();
            ctx.moveTo(width * 0.95, 0);
            ctx.lineTo(width * 0.95, height);
            ctx.stroke();

            // 4. Speed Lines / Texture Details (Comic Dots)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (let i = 0; i < 50; i++) {
                const rx = Math.random() * width;
                const ry = Math.random() * height;
                const rSize = Math.random() * 3 + 1;
                ctx.beginPath();
                ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        return canvas;
    }
}

/**
 * Create game texture atlas with all collectibles and obstacles
 */
export function createGameAtlas(): TextureAtlas {
    const atlas = new TextureAtlas(1024);

    // Coin texture (gold)
    const coinTex = TextureAtlas.createProceduralTexture(128, 128, '#FFD700', 'dots');
    atlas.addTexture('coin', coinTex, 0, 0, 128, 128);

    // Gene texture (cyan)
    const geneTex = TextureAtlas.createProceduralTexture(128, 128, '#00FFFF', 'noise');
    atlas.addTexture('gene', geneTex, 128, 0, 128, 128);

    // Shield texture (blue)
    const shieldTex = TextureAtlas.createProceduralTexture(128, 128, '#0099FF', 'solid');
    atlas.addTexture('shield', shieldTex, 256, 0, 128, 128);

    // Boost texture (orange)
    const boostTex = TextureAtlas.createProceduralTexture(128, 128, '#FF4500', 'solid');
    atlas.addTexture('boost', boostTex, 384, 0, 128, 128);

    // Magnet texture (magenta)
    const magnetTex = TextureAtlas.createProceduralTexture(128, 128, '#FF00FF', 'dots');
    atlas.addTexture('magnet', magnetTex, 0, 128, 128, 128);

    // Obstacle texture (dark red)
    const obstacleTex = TextureAtlas.createProceduralTexture(128, 128, '#A52A2A', 'dots');
    atlas.addTexture('obstacle', obstacleTex, 128, 128, 128, 128);

    // Pipe texture for Road (High Res)
    const pipeTex = TextureAtlas.createProceduralTexture(512, 512, '#600000', 'pipe');
    atlas.addTexture('road_pipe', pipeTex, 0, 256, 512, 512);

    return atlas;
}
