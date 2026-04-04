/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPerformanceManager } from '../performance/PerformanceManager';
import { getStabilityManager } from '../stability/StabilityManager';

export interface SharedMetrics {
    fps: number;
    stabilityScore: number;
    systemTimings: Record<string, number>;
}

const metricsListeners: Set<(_m: SharedMetrics) => void> = new Set();
let metricsInterval: ReturnType<typeof setInterval> | null = null;
let currentMetrics: SharedMetrics = {
    fps: 60,
    stabilityScore: 100,
    systemTimings: {}
};

export const startMetricsPolling = () => {
    if (metricsInterval) return;

    const updateMetrics = () => {
        const pm = getPerformanceManager();
        const sm = getStabilityManager();

        currentMetrics = {
            fps: pm.getMetrics().fps,
            stabilityScore: sm.getMetrics().stabilityScore,
            systemTimings: pm.getMetrics().systemTimings
        };

        metricsListeners.forEach(cb => cb(currentMetrics));
    };

    updateMetrics();
    metricsInterval = setInterval(updateMetrics, 2000);
};

export const stopMetricsPolling = () => {
    if (metricsInterval && metricsListeners.size === 0) {
        clearInterval(metricsInterval);
        metricsInterval = null;
    }
};

export const addMetricsListener = (cb: (_m: SharedMetrics) => void) => {
    metricsListeners.add(cb);
    startMetricsPolling();
};

export const removeMetricsListener = (cb: (_m: SharedMetrics) => void) => {
    metricsListeners.delete(cb);
    stopMetricsPolling();
};

export const getCurrentMetrics = () => currentMetrics;
