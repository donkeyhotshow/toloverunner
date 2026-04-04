/**
 * DropShadow - Простая тень под объектом
 * 
 * Помогает понять высоту прыжка и положение объектов на дороге
 */

import React from 'react';

interface DropShadowProps {
    size?: number;
    opacity?: number;
    color?: string;
    yOffset?: number;
}

export const DropShadow: React.FC<DropShadowProps> = ({
    size = 1.0,
    opacity = 0.3,
    color = '#000000',
    yOffset = -0.8,
}) => {
    return (
        <mesh position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[size, 16]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                depthWrite={false}
            />
        </mesh>
    );
};

export default DropShadow;
