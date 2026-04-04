import React, { useEffect, useRef } from 'react';
import { getPerformanceManager, PerformanceMetrics } from '../../infrastructure/performance/PerformanceManager';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { GameState } from '../../store/storeTypes';

type MetricRecord = {
    t: number;
    distance: number;
    metrics: PerformanceMetrics;
    eventsCount: number;
};

export const Reporting: React.FC = () => {
    const perf = getPerformanceManager();
    const metricsLogRef = useRef<MetricRecord[]>([]);
    const screenshotsRef = useRef<Record<string, string>>({});
    const gameStatusRef = useRef<GameStatus | null>(null);

    const captureScreenshot = React.useCallback((name: string) => {
        try {
            const canvas = document.querySelector('canvas');
            if (!canvas) return;

            // Ensure minimal render is disabled for a couple frames so full scene is drawn.
            const prevMinimal = window.__TOLOVERUNNER_MINIMAL_RENDER__;
            try { window.__TOLOVERUNNER_MINIMAL_RENDER__ = false; } catch { }

            // Wait two rafs to ensure the scene has a chance to fully render with objects visible
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    try {
                        const data = (canvas as HTMLCanvasElement).toDataURL('image/png');
                        screenshotsRef.current[name] = data;
                        window.__TOLOVERUNNER_SCREENSHOTS__ = screenshotsRef.current;
                    } catch {
                        // ignore
                    } finally {
                        // Restore previous minimal flag
                        try { window.__TOLOVERUNNER_MINIMAL_RENDER__ = prevMinimal; } catch { }
                    }
                });
            });
        } catch {
            // ignore
        }
    }, []);

    const exportReports = React.useCallback(() => {
        try {
            const metrics = {
                distanceReached: useStore.getState().distance || 0,
                metricsLog: metricsLogRef.current,
                fps: perf.getMetrics().fps,
                memory: performance.memory ? performance.memory.usedJSHeapSize : null,
                events: window.__vqa_events || []
            };
            const json = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' });
            download('visual_metrics.json', json);

            // Save screenshots as separate files
            Object.entries(screenshotsRef.current).forEach(([name, dataUrl]) => {
                const bin = dataURLToBlob(dataUrl);
                if (bin) download(`${name}.png`, bin);
            });

            // QA report (simple)
            const qaLines: string[] = [];
            qaLines.push(`# QA Visual Report`);
            qaLines.push(`Generated: ${new Date().toISOString()}`);
            qaLines.push(`DistanceReached: ${metrics.distanceReached}`);
            qaLines.push(`FPS: ${metrics.fps}`);
            qaLines.push(`Memory: ${metrics.memory}`);
            qaLines.push(`EventsCaptured: ${metrics.events.length}`);
            qaLines.push(`Screenshots: ${Object.keys(screenshotsRef.current).join(', ')}`);
            const qaBlob = new Blob([qaLines.join('\n')], { type: 'text/markdown' });
            download('QA_VISUAL_REPORT.md', qaBlob);
        } catch (e) {
            console.error('Export reports failed', e);
        }
    }, [perf]);

    useEffect(() => {
        // Periodic sampler - mirror PerformanceManager but include distance and event counts
        const sampler = window.setInterval(() => {
            try {
                const metrics = perf.getMetrics();
                const distance = useStore.getState().distance || 0;
                const eventsCount = window.__vqa_events ? window.__vqa_events.length : 0;
                const rec: MetricRecord = { t: Date.now(), distance, metrics, eventsCount };
                metricsLogRef.current.push(rec);
                // keep bounded
                if (metricsLogRef.current.length > 360) metricsLogRef.current.shift();
                // expose for external collectors
                window.__TOLOVERUNNER_VISUAL_METRICS__ = metricsLogRef.current;
            } catch { /* ignore */ }
        }, 5000);

        // Start screenshots: start-screen immediately.
        setTimeout(() => captureScreenshot('start-screen'), 200);
        // Do NOT capture gameplay or jump screenshots while the game is in PLAYING state.
        const initialStatus = useStore.getState().status;
        let gameplayTimer: number | null = null;
        if (initialStatus !== GameStatus.PLAYING) {
            // gameplay screenshot is optional and delayed (30s) to reduce ReadPixels stalls
            gameplayTimer = setTimeout(() => captureScreenshot('gameplay'), 30000) as unknown as number;
        }

        // Ensure global event buffer exists and subscribe to important game events
        window.__vqa_events = window.__vqa_events || [];
        const trackEvent = (n: string) => (e: Event) => {
            try {
                window.__vqa_events?.push({ t: Date.now(), type: n, detail: (e as CustomEvent).detail || null });
            } catch { }
        };
        const eventNames = ['scene-changed', 'player-hit', 'combo-triggered', 'perfect-timing', 'perfect-hit', 'player-collect-strong', 'player-dash', 'player-landing', 'dash-chain', 'player-boost', 'player-hit'];
        eventNames.forEach(n => document.addEventListener(n, trackEvent(n)));

        // Jump screenshot listener - only attach if not playing at start. We still track particle events always.
        const lastJumpCaptureRef = { last: 0 };
        const onParticleBurst = (e: Event) => {
            try {
                const customEvent = e as CustomEvent;
                if (customEvent?.detail?.type === 'jump') {
                    const now = Date.now();
                    if (now - (lastJumpCaptureRef.last || 0) > 5000) { // at most one jump screenshot per 5s
                        lastJumpCaptureRef.last = now;
                        // Only capture if game is not currently playing (to avoid stalls)
                        const st = useStore.getState().status;
                        if (st !== GameStatus.PLAYING) captureScreenshot('jump-' + now);
                    }
                }
            } catch { }
        };
        // Track particle events for metrics always
        document.addEventListener('particle-burst', trackEvent('particle-burst'));
        // Attach window listener for screenshot capture (but it will no-op during PLAYING)
        window.addEventListener('particle-burst', onParticleBurst);

        // Subscribe to game status to capture game-end and export reports
        const unsubscribe = useStore.subscribe(
            (state: GameState, prevState: GameState) => {
                const status = state.status;
                const prevStatus = prevState.status;

                if (status !== prevStatus) {
                    gameStatusRef.current = status;
                    if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
                        captureScreenshot('game-end');
                        // export reports shortly after end
                        setTimeout(() => exportReports(), 400);
                    }
                }
            }
        );

        return () => {
            clearInterval(sampler);
            if (gameplayTimer) clearTimeout(gameplayTimer);
            window.removeEventListener('particle-burst', onParticleBurst);
            document.removeEventListener('particle-burst', trackEvent('particle-burst'));
            eventNames.forEach(n => document.removeEventListener(n, trackEvent(n)));
            unsubscribe();
        };
    }, [perf, captureScreenshot, exportReports]);

    return null;
};

// Static helper functions
const download = (filename: string, content: Blob) => {
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const dataURLToBlob = (dataUrl: string) => {
    try {
        const arr = dataUrl.split(',');
        const match = arr[0]?.match(/:(.*?);/);
        const mime = match?.[1];
        const dataStr = arr[1];
        if (!match || !mime || arr.length < 2 || dataStr === undefined) return null;
        const bstr = atob(dataStr);
        let n = bstr.length;
        const u8 = new Uint8Array(n);
        while (n--) {
            u8[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8], { type: mime });
    } catch {
        return null;
    }
};

export default Reporting;
