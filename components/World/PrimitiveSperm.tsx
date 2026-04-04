/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PrimitiveSperm - Simplified version for maximum performance
 */

import React, { useMemo, useEffect } from 'react';
import { MeshBasicMaterial } from 'three';
import { SpermTail } from '../player/SpermTail';
import { CharacterType } from '../../types';
import { getGeometryPool } from '../../infrastructure/rendering/GeometryPool';
import { applyWorldBending } from './WorldBendingShader';


interface PrimitiveSpermProps {
    color?: string;
    speedMult?: number;
    isBoosting?: boolean;
    type?: CharacterType;
    isShielded?: boolean;
    showHat?: boolean;
}

export const PrimitiveSperm: React.FC<PrimitiveSpermProps> = React.memo(({
    speedMult = 1,
    isBoosting = false,
}) => {
    // Geometries (pooled to avoid recreation)
    const headGeo = useMemo(() => getGeometryPool().getSphereGeometry(0.6, 16, 16), []);

    // Material with World Bending
    const whiteMaterial = useMemo(() => {
        const mat = new MeshBasicMaterial({ color: '#ffffff' });
        applyWorldBending(mat);
        return mat;
    }, []);

    useEffect(() => {
        return () => {
            getGeometryPool().release(headGeo);
        }
    }, [headGeo]);

    return (
        <group>
            {/* HEAD - simple white sphere */}
            <mesh geometry={headGeo} material={whiteMaterial} />

            {/* TAIL */}
            <SpermTail
                color="#ffffff"
                speedMult={speedMult}
                isBoosting={isBoosting}
                position={[0, 0, -0.55]}
            />
        </group>
    );
});

PrimitiveSperm.displayName = 'PrimitiveSperm';

export default PrimitiveSperm;
