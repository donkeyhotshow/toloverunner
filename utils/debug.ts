/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Debug Configuration - Production Safe
 */

// Production-safe debug configuration
export const DEBUG = import.meta.env.DEV;
export const ENABLE_PERFORMANCE_MONITOR = DEBUG;
export const ENABLE_DEBUG_OVERLAY = DEBUG;
export const ENABLE_CONSOLE_LOGS = DEBUG;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
    MIN_FPS: 30,
    TARGET_FPS: 60,
    MAX_DRAW_CALLS: 100,
    MAX_MEMORY_MB: 200
} as const;

// Debug helpers
export const debugLog = (...args: any[]) => {
    if (ENABLE_CONSOLE_LOGS) {
        console.log(...args);
    }
};

export const debugWarn = (...args: any[]) => {
    if (ENABLE_CONSOLE_LOGS) {
        console.warn(...args);
    }
};

export const debugError = (...args: any[]) => {
    if (ENABLE_CONSOLE_LOGS) {
        console.error(...args);
    }
};
