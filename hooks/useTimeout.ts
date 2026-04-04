/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useTimeout - Безопасный hook для setTimeout с автоматическим cleanup
 */

import { useEffect, useRef } from 'react';

/**
 * Hook для безопасного использования setTimeout с автоматической очисткой.
 * 
 * @param callback - Функция, которая будет вызвана после задержки
 * @param delay - Задержка в миллисекундах (null для отмены)
 * 
 * @example
 * ```tsx
 * useTimeout(() => {
 *   console.log('Delayed action');
 * }, 1000);
 * 
 * // Отменить таймаут
 * useTimeout(() => {
 *   console.log('This will never run');
 * }, null);
 * ```
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  // Сохраняем последний callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Настраиваем таймаут
  useEffect(() => {
    // Не запускаем если delay === null
    if (delay === null) {
      return;
    }

    const tick = () => {
      savedCallback.current?.();
    };

    const id = setTimeout(tick, delay);

    // Cleanup при unmount или изменении delay
    return () => clearTimeout(id);
  }, [delay]);
}
