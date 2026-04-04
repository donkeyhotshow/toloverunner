/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DebugOverlay - Расширенный overlay для мониторинга производительности
 * 
 * Показывает:
 * - FPS (текущий, средний, min, max)
 * - Draw calls и triangles
 * - Memory usage
 * - Active objects
 * - Current quality level
 * - Delta time
 */

import React, { useState, useEffect } from 'react';
import { BarChart2, Activity, Cpu, Eye, Layers } from 'lucide-react';
import { getPerformanceManager, PerformanceMetrics, QualityLevel } from '../../infrastructure/performance/PerformanceManager';
import { useStore } from '../../store';
import { GameStatus } from '../../types';

interface DebugOverlayProps {
    enabled?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    compact?: boolean;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
    enabled = true,
    position = 'top-right',
    compact = false,
}) => {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 60,
        averageFps: 60,
        minFps: 60,
        maxFps: 60,
        drawCalls: 0,
        triangles: 0,
        memoryUsed: 0,
        activeObjects: 0,
        deltaTime: 0,
        systemTimings: {},
    });
    const [quality, setQuality] = useState<QualityLevel>(QualityLevel.HIGH);
    const [fps, setFps] = useState(0);
    const [frameCount, setFrameCount] = useState(0);
    const [isGameRunning, setIsGameRunning] = useState(false);

    const { status, totalDistance, playerY } = useStore((s) => ({
        status: s.status,
        totalDistance: (s as any).totalDistance ?? 0,
        playerY: s.localPlayerState.position[1]
    }));

    // 🚨 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Проверка работоспособности игры
    React.useEffect(() => {
        console.log('🔍 DEBUG OVERLAY: Инициализация диагностики');

        let lastTime = performance.now();
        let frames = 0;
        let lastDistance = totalDistance;

        const measureFPS = () => {
            frames++;
            const now = performance.now();

            if (now - lastTime >= 1000) {
                const currentFps = Math.round((frames * 1000) / (now - lastTime));
                setFps(currentFps);
                setFrameCount(prev => prev + frames);

                // Проверка активности игры
                const distanceChanged = totalDistance !== lastDistance;
                setIsGameRunning(distanceChanged || frameCount > 10);

                console.log(`🎮 FPS: ${currentFps}, Distance: ${totalDistance}, Player Y: ${playerY?.toFixed(3)}, Game Active: ${distanceChanged}`);

                frames = 0;
                lastTime = now;
                lastDistance = totalDistance;
            }

            requestAnimationFrame(measureFPS);
        };

        const rafId = requestAnimationFrame(measureFPS);
        return () => cancelAnimationFrame(rafId);
    }, [totalDistance, playerY, frameCount]);

    useEffect(() => {
        const perfManager = getPerformanceManager();

        // Подписываемся на обновления метрик
        perfManager.onMetricsChanged((newMetrics) => {
            setMetrics(newMetrics);
        });

        // Подписываемся на изменения качества
        perfManager.onQualityChanged((newQuality) => {
            setQuality(newQuality);
        });

        // Обновляем метрики каждые 100ms
        const interval = setInterval(() => {
            setMetrics(perfManager.getMetrics());
            setQuality(perfManager.getCurrentQuality());
        }, 100);

        return () => {
            clearInterval(interval);
        };
    }, []);

    // Скрываем в меню
    if (status === GameStatus.MENU || status === GameStatus.SHOP || !enabled) {
        return null;
    }

    // Позиционирование
    const positionClasses = {
        'top-left': 'top-4 left-4',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-right': 'bottom-4 right-4',
    };

    // Цвет FPS
    const getFpsColor = (fps: number) => {
        if (fps >= 58) return '#00ff00';
        if (fps >= 45) return '#ffaa00';
        if (fps >= 30) return '#ff6600';
        return '#ff0000';
    };

    // Compact режим - минималистичный
    if (compact) {
        return (
            <div
                className={`absolute ${positionClasses[position]} pointer-events-none z-[1000] font-mono text-xs`}
                style={{
                    background: 'rgba(0,0,0,0.18)', // much less opaque to avoid hiding content
                    pointerEvents: 'none',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(51,51,51,0.15)',
                    color: getFpsColor(metrics.fps),
                    width: '320px',
                    maxHeight: '60vh',
                    overflowY: 'auto',
                }}
            >
                <div>
                    <strong>FPS:</strong> {metrics.fps} ({metrics.averageFps})
                </div>
                <div>
                    <strong>Quality:</strong> {QualityLevel[quality]?.toUpperCase() || quality}
                </div>
            </div>
        );
    }

    // Полный режим - детальный
    return (
        <div
            className={`absolute ${positionClasses[position]} pointer-events-none z-[1000] font-mono text-xs select-none`}
            style={{
                background: 'rgba(0,0,0,0.18)', // semi-transparent and light to avoid occlusion
                pointerEvents: 'none',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(68,68,68,0.15)',
                width: '320px',
                maxHeight: '70vh',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
        >
            {/* Заголовок */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                    borderBottom: '1px solid #555',
                    paddingBottom: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                }}
            >
                <Activity size={14} />
                <span>PERFORMANCE MONITOR</span>
            </div>

            {/* 🚨 КРИТИЧЕСКИЙ СТАТУС ИГРЫ */}
            <div
                style={{
                    backgroundColor: isGameRunning ? '#2d5a2d' : '#5a2d2d',
                    border: `2px solid ${isGameRunning ? '#4ade80' : '#ef4444'}`,
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '12px',
                    color: isGameRunning ? '#4ade80' : '#ef4444',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}
            >
                🎮 СТАТУС ИГРЫ: {isGameRunning ? 'АКТИВНА ✅' : 'ЗАСТЫЛА ❌'}
                <br />
                FPS: {fps} | Distance: {totalDistance.toFixed(1)} | Frames: {frameCount}
            </div>

            {/* FPS */}
            <div style={{ marginBottom: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#aaa',
                        marginBottom: '2px',
                    }}
                >
                    <BarChart2 size={12} />
                    <span>FPS</span>
                </div>
                <div style={{ paddingLeft: '16px' }}>
                    <div style={{ color: getFpsColor(metrics.fps) }}>
                        <strong>Current:</strong> {metrics.fps}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '10px' }}>
                        Avg: {metrics.averageFps} | Min: {metrics.minFps} | Max: {metrics.maxFps}
                    </div>
                </div>
            </div>

            {/* Quality */}
            <div style={{ marginBottom: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#aaa',
                        marginBottom: '2px',
                    }}
                >
                    <Eye size={12} />
                    <span>QUALITY</span>
                </div>
                <div style={{ paddingLeft: '16px' }}>
                    <div style={{ color: '#00ff88', fontWeight: 'bold' }}>
                        {QualityLevel[quality]?.toUpperCase() || quality}
                    </div>
                </div>
            </div>

            {/* Renderer */}
            <div style={{ marginBottom: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#aaa',
                        marginBottom: '2px',
                    }}
                >
                    <Cpu size={12} />
                    <span>RENDERER</span>
                </div>
                <div style={{ paddingLeft: '16px', color: '#ccc', fontSize: '10px' }}>
                    <div>Draw Calls: {metrics.drawCalls}</div>
                    <div>Triangles: {metrics.triangles.toLocaleString()}</div>
                </div>
            </div>

            {/* Objects */}
            <div style={{ marginBottom: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#aaa',
                        marginBottom: '2px',
                    }}
                >
                    <Layers size={12} />
                    <span>OBJECTS</span>
                </div>
                <div style={{ paddingLeft: '16px', color: '#ccc', fontSize: '10px' }}>
                    <div>Active: {metrics.activeObjects}</div>
                    <div>Delta: {metrics.deltaTime}ms</div>
                </div>
            </div>

            {/* Stability (Deterministic Protocol) */}
            <div style={{ marginBottom: '8px', borderTop: '1px dashed #555', paddingTop: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#ff00ff',
                        marginBottom: '2px',
                    }}
                >
                    <Activity size={12} />
                    <span>STABILITY (PROTOCOL)</span>
                </div>
                <div style={{ paddingLeft: '16px', color: '#ccc', fontSize: '10px' }}>
                    <div>Dist: {totalDistance.toFixed(2)}</div>
                    <div>Modulo: {(totalDistance % 1000.0).toFixed(4)}</div>
                    <div style={{ color: Math.abs(playerY - 0.5) < 0.011 ? '#0f0' : '#f00' }}>
                        Player Y: {playerY.toFixed(6)}
                    </div>
                </div>
            </div>

            {/* Network (Multiplayer specific) */}
            <NetworkStatsSection />

            {/* Hint */}
            <div
                style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid #555',
                    color: '#777',
                    fontSize: '9px',
                    textAlign: 'center',
                }}
            >
                F3: Toggle
            </div>
        </div>
    );
};

const NetworkStatsSection: React.FC = () => {
    const { isMultiplayer, connectionStatus, roomCode, tdi, metrics } = useStore(state => ({
        isMultiplayer: state.isMultiplayer,
        connectionStatus: state.connectionStatus,
        roomCode: state.roomCode,
        tdi: state.tdi,
        metrics: state.metrics
    }));

    if (!isMultiplayer) return null;

    return (
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #555' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#00ccff',
                    marginBottom: '4px',
                }}
            >
                <Activity size={12} />
                <span>NETWORK ({connectionStatus.toUpperCase()})</span>
            </div>
            <div style={{ paddingLeft: '16px', color: '#ccc', fontSize: '10px' }}>
                <div>Room: <span style={{ color: '#fff' }}>{roomCode || '---'}</span></div>
                <div>Ping: <span style={{ color: metrics.ping < 100 ? '#0f0' : '#f80' }}>{Math.round(metrics.ping)}ms</span></div>
                <div>TDI: <span style={{ color: tdi > 0.7 ? '#f44' : '#fff' }}>{(tdi * 10).toFixed(1)} / 10.0</span></div>
            </div>
        </div>
    );
};

