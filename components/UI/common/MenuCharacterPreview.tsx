/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ToonSperm } from '../../player/ToonSperm';
import { motion } from 'framer-motion';

export const MenuCharacterPreview: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="absolute right-0 bottom-0 w-[600px] h-[600px] pointer-events-none select-none z-0 hidden md:block"
        >
            <Canvas
                shadows
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={1.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />

                <Suspense fallback={null}>
                    <PreviewSperm />
                </Suspense>
            </Canvas>
        </motion.div>
    );
};

const PreviewSperm: React.FC = () => {
    const groupRef = React.useRef<THREE.Group>(null);

    // Simple rotation for the preview
    React.useEffect(() => {
        let frameId: number;
        const animate = (time: number) => {
            if (groupRef.current) {
                groupRef.current.rotation.y = Math.sin(time / 2000) * 0.3;
                groupRef.current.position.y = Math.sin(time / 1000) * 0.1;
            }
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <group ref={groupRef} scale={1.5}>
            <ToonSperm speed={0.6} scale={1.2} />
        </group>
    );
};
