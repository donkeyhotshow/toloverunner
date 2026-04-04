/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Глобальные расширения (Window, Performance). Экспортируемые типы игры — см. корневой types.ts.
 */

export {};

declare global {
  interface Window {
    /** GPU detection results from GPUDetector */
    __GPU_DETECTION_RESULTS__?: {
      tier: number;
      type: string;
      isMobile: boolean;
      gpu?: string;
    };
    /** Performance monitor instance */
    __PERFORMANCE_MONITOR__?: {
      fps: number;
      memory?: number;
    };
    /** Game test results for E2E testing */
    __GAME_TEST_RESULTS__?: {
      passed: boolean;
      errors: string[];
    };
    /** Emergency mode flag - used by StabilityManager */
    __TOLOVERUNNER_EMERGENCY_MODE__?: boolean;
    /** Debug namespace for all ToLoveRunner globals */
    __TOLOVERUNNER_DEBUG__?: {
      GL?: unknown;
      SCENE?: unknown;
      CAMERA?: unknown;
      STORE?: unknown;
      METRICS_LOG?: unknown[];
      QUALITY?: { level: number; settings: unknown };
      EMERGENCY_MODE?: boolean;
      MINIMAL_RENDER?: boolean;
      LOW_QUALITY?: boolean;
    };
    /** VQA expose store flag for testing */
    __VQA_EXPOSE_STORE__?: string;
    /** VQA / visual metrics */
    __vqa_events?: Array<{ t: number; type: string; detail: unknown }>;
    __TOLOVERUNNER_VISUAL_METRICS__?: unknown[];
    __TOLOVERUNNER_SCREENSHOTS__?: Record<string, string>;
    __TOLOVERUNNER_MINIMAL_RENDER__?: boolean;
    __TOLOVERUNNER_QUALITY__?: unknown;
    __TOLOVERUNNER_STORE__?: { getState: () => unknown; setState: (s: unknown) => void };
    __RENDER_DEBUGGER__?: unknown;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}
