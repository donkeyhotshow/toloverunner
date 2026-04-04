import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Html, OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { SpermModel3D } from '../player/SpermModel3D';
import { BackgroundTunnel } from '../World/BackgroundTunnel';
import { VirusObstacles } from '../World/VirusObstacle';
import { PrimitiveSperm } from '../World/PrimitiveSperm';
import { GameObject, ObjectType, CharacterType } from '../../types';
import { useStore } from '../../store';
import { Group } from 'three';

type ViewCategory = 'PLAYER' | 'ENEMIES' | 'OBSTACLES' | 'ENVIRONMENT';

const clamp = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : min);

export const AssetShowcase: React.FC = () => {
    const [category, setCategory] = useState<ViewCategory>('PLAYER');
    const [selectedType, setSelectedType] = useState<string>('TYPE_X');
    const resetGame = useStore(s => s.resetGame);
    const setDistance = useStore(s => s.setDistance);

    // Controls State — безопасные начальные значения
    const [controls, setControls] = useState({
        isBoosting: false,
        speedMultiplier: 1.0,
        lightIntensity: 1.5,
        rotateModel: true,
        showGrid: true,
        roadSpeed: 0,
        godMode: false,
        lodLevel: 0
    });

    // Dummy refs for VirusObstacles
    const objectsRef = useRef<GameObject[]>([]);
    const totalDistanceRef = useRef(0);
    const modelGroupRef = useRef<Group>(null);

    // Populate dummy objects for enemies/obstacles
    useEffect(() => {
        const dummyData: GameObject[] = [];
        if (category === 'ENEMIES') {
            for (let i = 0; i < 5; i++) {
                dummyData.push({
                    id: `enemy-${i}`,
                    type: ObjectType.OBSTACLE,
                    position: [(i - 2) * 4, 0, 0],
                    active: true,
                });
            }
        } else if (category === 'OBSTACLES') {
            // Add different obstacle types here if defined
        }
        objectsRef.current = dummyData;
    }, [category]);

    // Animation loop
    useEffect(() => {
        const callback = (delta: number, _time: number) => {
            // Rotate model if enabled
            if (controls.rotateModel && modelGroupRef.current) {
                modelGroupRef.current.rotation.y += delta * 0.5;
            }

            // Move road
            if (category === 'ENVIRONMENT') {
                const roadSpeed = clamp(controls.roadSpeed, 0, 50);
                const moveAmount = delta * roadSpeed * 10;
                totalDistanceRef.current += moveAmount;
                const currentDist = Number(useStore.getState().distance) || 0;
                useStore.getState().setDistance(currentDist + moveAmount);
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => unregisterGameLoopCallback('renderUpdate', callback);
    }, [category, controls.rotateModel, controls.roadSpeed]);

    // Reset store distance on unmount
    useEffect(() => {
        return () => setDistance(0);
    }, [setDistance]);

    const updateControl = (key: keyof typeof controls, value: number | boolean) => {
        setControls(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'speedMultiplier' && typeof value === 'number') next.speedMultiplier = clamp(value, 0, 5);
            if (key === 'lightIntensity' && typeof value === 'number') next.lightIntensity = clamp(value, 0, 3);
            if (key === 'roadSpeed' && typeof value === 'number') next.roadSpeed = clamp(value, 0, 50);
            if (key === 'lodLevel' && typeof value === 'number') next.lodLevel = Math.min(2, Math.max(0, Math.floor(value)));
            return next;
        });
    };

    return (
        <group>
            {/* Lighting */}
            <ambientLight intensity={0.5 * controls.lightIntensity} />
            <pointLight position={[10, 10, 10]} intensity={1 * controls.lightIntensity} />
            <directionalLight position={[0, 5, 5]} intensity={1 * controls.lightIntensity} castShadow />

            <PerspectiveCamera makeDefault position={[0, 2, 8]} fov={50} />

            {/* Helper Grid */}
            {controls.showGrid && <Grid infiniteGrid fadeDistance={50} sectionColor="#444" cellColor="#222" />}

            {/* Controls */}
            <OrbitControls makeDefault minDistance={2} maxDistance={20} />

            {/* Content Group */}
            <group ref={modelGroupRef}>
                {category === 'PLAYER' && (
                    <group scale={[10, 10, 10]} position={[0, 0, 0]}>
                        {/* Try to use SpermModel3D if asset exists, otherwise fallback to Primitive */}
                        <Suspense fallback={<PrimitiveSperm type={selectedType as CharacterType} />}>
                            <SpermModel3D
                                isBoosting={controls.isBoosting}
                                speedMultiplier={controls.speedMultiplier}
                            />
                        </Suspense>

                        {/* Info Label */}
                        <Html position={[0, 2, 0]} center>
                            <div className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm border border-white/20">
                                SPERM {selectedType}
                            </div>
                        </Html>
                    </group>
                )}

                {category === 'ENEMIES' && (
                    <VirusObstacles
                        objectsRef={objectsRef}
                        totalDistanceRef={totalDistanceRef}
                    />
                )}

                {category === 'ENVIRONMENT' && <BackgroundTunnel />}
            </group>

            {/* UI Overlay */}
            <Html fullscreen style={{ pointerEvents: 'none' }}>
                <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none select-none font-comic">

                    {/* Top Bar: Categories */}
                    <div className="pointer-events-auto flex flex-col gap-2 items-center bg-black/60 p-4 rounded-2xl backdrop-blur-md self-center border border-white/10 shadow-2xl transform -rotate-1">
                        <div className="text-[#00FFFF] font-bold text-xs mb-1 tracking-widest uppercase">Select Category</div>
                        <div className="flex gap-2">
                            {(['PLAYER', 'ENEMIES', 'OBSTACLES', 'ENVIRONMENT'] as ViewCategory[]).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all border-b-4 ${category === cat ? 'bg-[#FF1493] text-white border-[#880044] -translate-y-1' : 'bg-white/10 text-gray-400 border-transparent hover:text-white'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {category === 'PLAYER' && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-white/10 w-full justify-center">
                                {(['TYPE_X', 'TYPE_Y'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedType === type ? 'bg-[#00FFFF] text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>


                    {/* Right Panel: Controls */}
                    <div className="absolute top-20 right-6 pointer-events-auto bg-black/80 p-4 rounded-xl backdrop-blur-sm border border-white/10 w-64 text-white text-xs font-mono">
                        <div className="font-bold text-sm mb-3 text-center border-b border-white/20 pb-2">CONTROLS</div>

                        {/* Player Controls */}
                        <div className="mb-4">
                            <div className="text-blue-400 font-bold mb-2">PLAYER</div>
                            <label className="flex items-center justify-between mb-2 cursor-pointer">
                                <span>God Mode</span>
                                <input type="checkbox" checked={controls.godMode} onChange={e => updateControl('godMode', e.target.checked)} />
                            </label>
                            <label className="flex items-center justify-between mb-2 cursor-pointer">
                                <span>Boosting</span>
                                <input type="checkbox" checked={controls.isBoosting} onChange={e => updateControl('isBoosting', e.target.checked)} />
                            </label>
                            <div className="mb-2">
                                <div className="flex justify-between mb-1"><span>Speed Mult</span> <span>{controls.speedMultiplier.toFixed(1)}x</span></div>
                                <input type="range" min="0" max="5" step="0.1" value={controls.speedMultiplier} onChange={e => updateControl('speedMultiplier', parseFloat(e.target.value))} className="w-full" />
                            </div>
                            <div className="mb-2">
                                <div className="flex justify-between mb-1"><span>LOD Level</span> <span>{controls.lodLevel}</span></div>
                                <input type="range" min="0" max="2" step="1" value={controls.lodLevel} onChange={e => updateControl('lodLevel', parseInt(e.target.value))} className="w-full" />
                            </div>
                        </div>

                        {/* Environment Controls */}
                        <div className="mb-4">
                            <div className="text-green-400 font-bold mb-2">ENVIRONMENT</div>
                            <div className="mb-2">
                                <div className="flex justify-between mb-1"><span>Road Speed</span> <span>{controls.roadSpeed}</span></div>
                                <input type="range" min="0" max="50" step="1" value={controls.roadSpeed} onChange={e => updateControl('roadSpeed', parseFloat(e.target.value))} className="w-full" />
                            </div>
                            <div className="mb-2">
                                <div className="flex justify-between mb-1"><span>Light Intensity</span> <span>{controls.lightIntensity.toFixed(1)}</span></div>
                                <input type="range" min="0" max="3" step="0.1" value={controls.lightIntensity} onChange={e => updateControl('lightIntensity', parseFloat(e.target.value))} className="w-full" />
                            </div>
                            <label className="flex items-center justify-between mb-2 cursor-pointer">
                                <span>Show Grid</span>
                                <input type="checkbox" checked={controls.showGrid} onChange={e => updateControl('showGrid', e.target.checked)} />
                            </label>
                            <label className="flex items-center justify-between mb-2 cursor-pointer">
                                <span>Auto Rotate</span>
                                <input type="checkbox" checked={controls.rotateModel} onChange={e => updateControl('rotateModel', e.target.checked)} />
                            </label>
                        </div>
                    </div>

                    {/* Bottom: Exit — сброс состояния как при возврате в меню */}
                    <div className="pointer-events-auto flex justify-center">
                        <button
                            onClick={() => resetGame()}
                            className="px-6 py-2 bg-red-500/80 hover:bg-red-600 text-white font-bold rounded-lg backdrop-blur-sm transition-all shadow-lg text-sm"
                        >
                            EXIT SHOWCASE
                        </button>
                    </div>
                </div>
            </Html>
        </group>
    );
};
