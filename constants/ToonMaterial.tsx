/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ToonMaterial - Компонент для применения toon shader с outline
 * ИСПРАВЛЕНО: Упрощенная версия без клонирования children
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';


interface ToonMaterialProps {
    color?: string;
    outlineColor?: string;
    outlineWidth?: number;
    children: React.ReactNode;
}

/**
 * ToonMaterial - Применяет toon shader к дочерним элементам
 * Упрощенная версия: просто оборачивает children и применяет материал через traverse
 */
export const ToonMaterial: React.FC<ToonMaterialProps> = React.memo(({
    color = '#ffffff',
    children
}) => {
    const groupRef = useRef<THREE.Group>(null);

    const toonMat = useMemo(() => new THREE.MeshToonMaterial({
        color: new THREE.Color(color),
    }), [color]);

    // Применяем материал к mesh'ам после монтирования
    useEffect(() => {
        if (!groupRef.current) return;

        groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = toonMat;
            }
        });
    }, [toonMat]);

    return (
        <group ref={groupRef}>
            {children}
        </group>
    );
});

ToonMaterial.displayName = 'ToonMaterial';
