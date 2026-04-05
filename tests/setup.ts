/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Настройка тестового окружения
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Расширяем expect matchers (опционально, если нужны дополнительные matchers)
try {
  expect.extend(matchers);
} catch (e) {
  // Matchers уже расширены или недоступны
}

// Очистка после каждого теста
afterEach(() => {
  cleanup();
});

declare global {
  var mockStore: any;
  // ResizeObserver and others are defined in lib.dom.d.ts or standard env
}

// Моки для Web APIs
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Мок для requestAnimationFrame
global.requestAnimationFrame = ((callback: (time: number) => void) => {
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
}) as typeof global.requestAnimationFrame;

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Мок для window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

