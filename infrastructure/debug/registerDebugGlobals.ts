/**
@license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Debug Globals Registry - Централизованное управление window globals
 *
 * Все debug-переменные регистрируются через этот модуль.
 * В production сборке код tree-shaken благодаря import.meta.env.PROD проверкам.
 */

import type { WebGLRenderer, Scene, Camera } from 'three';
import type { PerformanceMetrics } from '../performance/PerformanceManager';

/**
 * Типизированный интерфейс для debug globals
 */
export interface ToLoveRunnerDebugGlobals {
    GL?: WebGLRenderer;
    SCENE?: Scene;
    CAMERA?: Camera;
    STORE?: {
        getState: () => unknown;
        setState: (state: unknown) => void;
    };
    METRICS_LOG?: PerformanceMetrics[];
    QUALITY?: {
        level: number;
        settings: unknown;
    };
    EMERGENCY_MODE?: boolean;
    MINIMAL_RENDER?: boolean;
    LOW_QUALITY?: boolean;
}

// Namespace для всех debug globals
const DEBUG_NAMESPACE = '__TOLOVERUNNER_DEBUG__';

/**
 * Проверка dev-режима
 */
function isDevMode(): boolean {
    return import.meta.env.DEV;
}

/**
 * Получить namespace объект для debug globals
 */
function getDebugNamespace(): ToLoveRunnerDebugGlobals {
    if (typeof window === 'undefined') return {};

    const win = window as unknown as Window & Record<string, unknown>;
    if (!win[DEBUG_NAMESPACE]) {
        win[DEBUG_NAMESPACE] = {};
    }
    return win[DEBUG_NAMESPACE] as ToLoveRunnerDebugGlobals;
}

/**
 * Регистрация WebGL renderer для отладки
 */
export function registerDebugRenderer(gl: WebGLRenderer): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.GL = gl;

    // Legacy support для существующего кода
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_GL__ = gl;
}

/**
 * Регистрация Three.js сцены для отладки
 */
export function registerDebugScene(scene: Scene): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.SCENE = scene;

    // Legacy support
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_SCENE__ = scene;
}

/**
 * Регистрация камеры для отладки
 */
export function registerDebugCamera(camera: Camera): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.CAMERA = camera;

    // Legacy support
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_CAMERA__ = camera;
}

/**
 * Регистрация Zustand store для отладки
 */
export function registerDebugStore(store: { getState: () => unknown; setState: (state: unknown) => void }): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.STORE = store;

    // Legacy support
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_STORE__ = store;
}

/**
 * Регистрация лога метрик производительности
 */
export function registerDebugMetricsLog(metricsLog: PerformanceMetrics[]): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.METRICS_LOG = metricsLog;

    // Legacy support
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_METRICS_LOG__ = metricsLog;
}

/**
 * Регистрация текущего качества графики
 */
export function registerDebugQuality(level: number, settings: unknown): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.QUALITY = { level, settings };

    // Legacy support
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_QUALITY__ = { level, settings };
}

/**
 * Установка флага emergency mode
 */
export function setEmergencyMode(enabled: boolean): void {
    const ns = getDebugNamespace();
    ns.EMERGENCY_MODE = enabled;

    // Этот флаг нужен и в production для внутренней логики
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_EMERGENCY_MODE__ = enabled;
}

/**
 * Проверка emergency mode (доступна и в production)
 */
export function isEmergencyMode(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as Window & Record<string, unknown>;
    return win.__TOLOVERUNNER_EMERGENCY_MODE__ === true;
}

/**
 * Установка флага minimal render mode
 */
export function setMinimalRenderMode(enabled: boolean): void {
    if (!isDevMode()) return;

    const ns = getDebugNamespace();
    ns.MINIMAL_RENDER = enabled;

    // Legacy support
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_MINIMAL_RENDER__ = enabled;
}

/**
 * Установка флага low quality
 */
export function setLowQualityMode(enabled: boolean): void {
    const ns = getDebugNamespace();
    ns.LOW_QUALITY = enabled;

    // Этот флаг используется в constants.ts
    const win = window as unknown as Window & Record<string, unknown>;
    win.__TOLOVERUNNER_LOW_QUALITY__ = enabled;
}

/**
 * Batch-регистрация всех debug globals (для Canvas onCreated)
 */
export function registerAllDebugGlobals(deps: {
    gl?: WebGLRenderer;
    scene?: Scene;
    camera?: Camera;
}): void {
    if (!isDevMode()) return;

    if (deps.gl) registerDebugRenderer(deps.gl);
    if (deps.scene) registerDebugScene(deps.scene);
    if (deps.camera) registerDebugCamera(deps.camera);
}

/**
 * Очистка всех debug globals (для cleanup)
 */
export function clearDebugGlobals(): void {
    if (typeof window === 'undefined') return;

    const win = window as unknown as Window & Record<string, unknown>;
    delete win[DEBUG_NAMESPACE];
    delete win.__TOLOVERUNNER_GL__;
    delete win.__TOLOVERUNNER_SCENE__;
    delete win.__TOLOVERUNNER_CAMERA__;
    delete win.__TOLOVERUNNER_STORE__;
    delete win.__TOLOVERUNNER_METRICS_LOG__;
    delete win.__TOLOVERUNNER_QUALITY__;
    delete win.__TOLOVERUNNER_EMERGENCY_MODE__;
    delete win.__TOLOVERUNNER_MINIMAL_RENDER__;
}

/**
 * Получить все debug globals (для DevTools)
 */
export function getDebugGlobals(): ToLoveRunnerDebugGlobals {
    return getDebugNamespace();
}
