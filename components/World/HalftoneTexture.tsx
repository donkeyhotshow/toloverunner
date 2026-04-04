/**
 * HalftoneTexture - Комиксный Halftone (Ben-Day Dots) эффект
 * 
 * Применяет паттерн точек к поверхностям для создания "печатного" комиксного вида
 * Согласно референсу: "apply a subtle halftone dot pattern (Ben-Day dots) texture"
 */

import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, MeshToonMaterial } from 'three';

export const useHalftoneTexture = (dotSize: number = 4, spacing: number = 8) => {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Белый фон
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Рисуем паттерн точек (Ben-Day dots)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // 🎨 Subtle dots

        for (let y = 0; y < size; y += spacing) {
            for (let x = 0; x < size; x += spacing) {
                ctx.beginPath();
                ctx.arc(x + spacing / 2, y + spacing / 2, dotSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const texture = new CanvasTexture(canvas);
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.repeat.set(4, 4); // Повторяем паттерн

        return texture;
    }, [dotSize, spacing]);
};

/**
 * HalftoneMaterial - Готовый материал с halftone эффектом
 */
export const useHalftoneMaterial = (baseColor: string = '#ffffff', dotSize?: number, spacing?: number) => {
    const halftoneMap = useHalftoneTexture(dotSize, spacing);

    return useMemo(() => {
        return new MeshToonMaterial({
            color: baseColor,
            map: halftoneMap,
            transparent: false,
        });
    }, [baseColor, halftoneMap]);
};

export default useHalftoneTexture;
