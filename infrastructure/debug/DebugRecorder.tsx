/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DebugRecorder - "Black Box" recorder for game sessions
 *
 * Features:
 * - Captures console logs (log, warn, error)
 * - Captures application state snapshots
 * - Captures performance metrics (FPS, memory)
 * - Takes periodic screenshots of the canvas
 * - Stores data in memory for download on crash
 */

import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store';
import { GameStatus } from '../../types';

interface DebugRecording {
    logs: { type: string; message: string; timestamp: string }[];
    stateSnapshots: { type: string; data: Record<string, unknown>; timestamp: string }[];
    performanceMetrics: { fps: number; memory: number; timestamp: string }[];
    screenshots: { data: string; timestamp: string }[];
    errors: { message: string; stack?: string; timestamp: string }[];
    startTime: string;
    endTime?: string;
}

// Global persistence for access from ErrorBoundary after unmount
declare global {
    interface Window {
        __TOLOVERUNNER_RECORDER__?: {
            getData: () => DebugRecording;
            clear: () => void;
            captureError: (error: Error) => void;
            captureState: (type: string, data: Record<string, unknown>) => void;
        };
    }
}

const MAX_SCREENSHOTS = 100;
const MAX_LOGS = 500;
const MAX_STATE_SNAPSHOTS = 50;
const MAX_PERFORMANCE_METRICS = 100;

export const DebugRecorder: React.FC = () => {
    const { gl } = useThree();
    const status = useStore(s => s.status);
    const distance = useStore(s => s.distance);
    const speed = useStore(s => s.speed);
    const score = useStore(s => s.score);
    const combo = useStore(s => s.combo);
    const lives = useStore(s => s.lives);
    const lastScreenshotTime = useRef(0);
    const lastStateCaptureTime = useRef(0);
    const lastMetricsCaptureTime = useRef(0);
    const fpsHistory = useRef<number[]>([]);
    const recordingRef = useRef<DebugRecording>({
        logs: [],
        stateSnapshots: [],
        performanceMetrics: [],
        screenshots: [],
        errors: [],
        startTime: new Date().toISOString()
    });

    const isRecording = status === GameStatus.PLAYING || status === GameStatus.COUNTDOWN;

    // 0. Error handler for global errors
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            recordingRef.current.errors.push({
                message: event.message,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            recordingRef.current.errors.push({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    // 1. Console Monkey-patching
    useEffect(() => {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const capture = (type: string, args: unknown[]) => {
            const message = args.map((arg: unknown) => {
                if (typeof arg === 'object') {
                    try { return JSON.stringify(arg); } catch { return String(arg); }
                }
                return String(arg);
            }).join(' ');

            const entry = { type, message, timestamp: new Date().toISOString() };
            recordingRef.current.logs.push(entry);
            
            if (recordingRef.current.logs.length > MAX_LOGS) {
                recordingRef.current.logs.shift();
            }
        };

        console.log = (...args) => {
            capture('log', args);
            originalLog(...args);
        };
        console.warn = (...args) => {
            capture('warn', args);
            originalWarn(...args);
        };
        console.error = (...args) => {
            capture('error', args);
            originalError(...args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    // 2. Periodic Screenshots, State Capture and Performance Metrics
    useFrame((state) => {
        if (!isRecording) return;
        
        const now = state.clock.elapsedTime;
        
        // Capture state every 5 seconds
        if (now - lastStateCaptureTime.current >= 5) {
            const stateSnapshot = {
                type: 'game_state',
                data: {
                    status,
                    distance: Math.round(distance),
                    speed: Math.round(speed * 100) / 100,
                    score,
                    combo,
                    lives,
                    timestamp: now
                },
                timestamp: new Date().toISOString()
            };
            recordingRef.current.stateSnapshots.push(stateSnapshot);
            
            if (recordingRef.current.stateSnapshots.length > MAX_STATE_SNAPSHOTS) {
                recordingRef.current.stateSnapshots.shift();
            }
            lastStateCaptureTime.current = now;
        }

        // Capture performance metrics every 1 second
        if (now - lastMetricsCaptureTime.current >= 1) {
            const fps = state.clock.getDelta() > 0 ? Math.round(1 / state.clock.getDelta()) : 60;
            fpsHistory.current.push(fps);
            if (fpsHistory.current.length > 10) {
                fpsHistory.current.shift();
            }
            const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
            
            // Get memory usage if available
            let memoryUsage = 0;
            if ('memory' in performance) {
                const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
                memoryUsage = Math.round(mem.usedJSHeapSize / (1024 * 1024)); // MB
            }

            recordingRef.current.performanceMetrics.push({
                fps: Math.round(avgFps),
                memory: memoryUsage,
                timestamp: new Date().toISOString()
            });

            if (recordingRef.current.performanceMetrics.length > MAX_PERFORMANCE_METRICS) {
                recordingRef.current.performanceMetrics.shift();
            }
            lastMetricsCaptureTime.current = now;
        }
        
        // Periodic Screenshots (every 3 seconds)
        if (now - lastScreenshotTime.current >= 3) {
            try {
                // toDataURL must be called in the same frame as render
                const data = gl.domElement.toDataURL('image/jpeg', 0.5);
                
                recordingRef.current.screenshots.push({
                    data,
                    timestamp: new Date().toISOString()
                });

                if (recordingRef.current.screenshots.length > MAX_SCREENSHOTS) {
                    recordingRef.current.screenshots.shift();
                }
                lastScreenshotTime.current = now;
            } catch (err) {
                // Silently fail to avoid loop
                console.debug('Screenshot capture failed:', err);
            }
        }
    });

    // 3. Expose to Window
    useEffect(() => {
        window.__TOLOVERUNNER_RECORDER__ = {
            getData: () => ({
                ...recordingRef.current,
                endTime: new Date().toISOString()
            }),
            clear: () => {
                recordingRef.current = {
                    logs: [],
                    stateSnapshots: [],
                    performanceMetrics: [],
                    screenshots: [],
                    errors: [],
                    startTime: new Date().toISOString()
                };
                fpsHistory.current = [];
            },
            captureError: (error: Error) => {
                recordingRef.current.errors.push({
                    message: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
            },
            captureState: (type: string, data: Record<string, unknown>) => {
                recordingRef.current.stateSnapshots.push({
                    type,
                    data,
                    timestamp: new Date().toISOString()
                });
                if (recordingRef.current.stateSnapshots.length > MAX_STATE_SNAPSHOTS) {
                    recordingRef.current.stateSnapshots.shift();
                }
            }
        };

        return () => {
            // We keep it on window for ErrorBoundary access
        };
    }, []);

    return null; // Visual-less component
};

/**
 * Utility to download the debug data as a JSON bundle
 */
export const downloadDebugData = () => {
    const data = window.__TOLOVERUNNER_RECORDER__?.getData();
    if (!data) {
        alert('No debug data available.');
        return;
    }

    // Create a clean version without screenshots for smaller file size
    const cleanData = {
        ...data,
        screenshots: data.screenshots.length > 0 
            ? `[${data.screenshots.length} screenshots captured - use getRawData() for full data]`
            : [],
        logs: data.logs.slice(-100), // Last 100 logs
        performanceMetrics: data.performanceMetrics.slice(-50), // Last 50 metrics
        stateSnapshots: data.stateSnapshots.slice(-20) // Last 20 snapshots
    };

    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toloverunner-debug-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Utility to download full raw debug data including screenshots
 */
export const downloadRawDebugData = () => {
    const data = window.__TOLOVERUNNER_RECORDER__?.getData();
    if (!data) {
        alert('No debug data available.');
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toloverunner-debug-full-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
