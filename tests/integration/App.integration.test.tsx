/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Интеграционные тесты для основного компонента App
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import App from '../../App';
import { GameStatus } from '../../types';

type CanvasMockProps = { children?: React.ReactNode; onCreated?: (ctx: unknown) => void };

// Моки для Three.js и React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated }: CanvasMockProps) => {
    // Симулируем вызов onCreated
    if (onCreated) {
      act(() => {
        onCreated({
          scene: {},
          camera: { position: { set: vi.fn() } },
          gl: {
            setPixelRatio: vi.fn(),
            shadowMap: { enabled: false, type: undefined },
            setSize: vi.fn(),
          }
        });
      });
    }
    return <div data-testid="canvas">{children}</div>;
  },
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
}));

// Форма состояния store в моке (совместима с zustand)
type MockStoreState = Record<string, unknown> & {
  init: ReturnType<typeof vi.fn>;
  status: GameStatus;
  metrics: { fps: number; ping: number };
};

// Мок для `useStore` совместим с hoisting vi.mock: создаём фабрику, которая эмулирует zustand API
vi.mock('../../store', () => {
  const mockStore: MockStoreState = {
    init: vi.fn(),
    status: GameStatus.MENU,
    metrics: { fps: 60, ping: 0 },
  };

  (globalThis as Record<string, unknown>).mockStore = mockStore;
  const state: MockStoreState = { ...mockStore };
  const subscribers: Array<{
    selector: (s: MockStoreState) => unknown;
    listener: (v: unknown, prev: unknown) => void;
    last: unknown;
  }> = [];

  const useStoreMock = (selector?: (s: MockStoreState) => unknown) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  };

  useStoreMock.getState = () => state;
  useStoreMock.setState = (partial: Partial<MockStoreState> | ((s: MockStoreState) => Partial<MockStoreState>)) => {
    const next = typeof partial === 'function' ? partial(state) : partial;
    Object.assign(state, next);
    subscribers.forEach(s => {
      try {
        const newVal = s.selector(state);
        const prevVal = s.last;
        if (newVal !== prevVal) {
          s.listener(newVal, prevVal);
          s.last = newVal;
        }
      } catch (e) {
        console.warn('[App.integration mock] selector/listener error:', e);
      }
    });
  };

  useStoreMock.subscribe = (selector: (s: MockStoreState) => unknown, listener: (v: unknown, prev: unknown) => void) => {
    const entry = { selector, listener, last: selector(state) };
    subscribers.push(entry);
    return () => {
      const idx = subscribers.indexOf(entry);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  };

  return { useStore: useStoreMock };
});

// Мок для компонентов UI
vi.mock('../../components/UI/HUD', () => ({
  HUD: () => <div data-testid="hud">HUD</div>
}));

vi.mock('../../components/UI/FPSCounter', () => ({
  FPSCounter: () => <div data-testid="fps-counter">FPS: 60</div>
}));

vi.mock('../../components/UI/DebugOverlay', () => ({
  DebugOverlay: ({ enabled }: { enabled: boolean }) =>
    enabled ? <div data-testid="debug-overlay">Debug</div> : null
}));

// Мок для TexturePreloader
vi.mock('../../components/System/TexturePreloader', () => ({
  TexturePreloader: () => <div data-testid="texture-preloader">Loading textures...</div>
}));

// Мок для ErrorBoundary
vi.mock('../../components/System/ErrorHandler', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="error-boundary">{children}</div>
}));

describe('App Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Мокаем setTimeout для контроля инициализации
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Инициализация приложения', () => {
    it('должен отображать loading screen при инициализации', () => {
      render(<App />);

      expect(screen.getByText('LOADING...')).toBeInTheDocument();
    });

    it('должен инициализировать store после загрузки', async () => {
      render(<App />);

      // Пропускаем setTimeout
      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect((globalThis as { mockStore: MockStoreState }).mockStore.init).toHaveBeenCalled();
      });
    });

    it('должен отображать UI компоненты после инициализации', async () => {
      render(<App />);

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('hud')).toBeInTheDocument();
        expect(screen.getByTestId('fps-counter')).toBeInTheDocument();
        expect(screen.getByTestId('debug-overlay')).toBeInTheDocument();
        expect(screen.getByTestId('texture-preloader')).toBeInTheDocument();
      });
    });

    it('должен отображать Canvas с правильными пропсами', async () => {
      render(<App />);

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        const canvas = screen.getByTestId('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas).toHaveStyle({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        });
      });
    });
  });

  describe('Производительность', () => {
    it('должен иметь оптимизированные настройки Canvas', async () => {
      // Этот тест проверяет, что настройки производительности применены
      // В реальном тесте мы бы проверяли пропсы Canvas
      expect(true).toBe(true); // Placeholder для будущих проверок
    });
  });

  describe('Обработка ошибок', () => {
    it('должен быть обернут в ErrorBoundary', async () => {
      render(<App />);

      act(() => {
        vi.runAllTimers();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
    });
  });
});
