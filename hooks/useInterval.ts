/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useInterval - Безопасный hook для setInterval с автоматическим cleanup
 */

import { useEffect, useRef } from 'react';

/**
 * Hook для безопасного использования setInterval с автоматической очисткой.
 * 
 * @param callback - Функция, которая будет вызываться по интервалу
 * @param delay - Задержка в миллисекундах (null для остановки)
 * 
 * @example
 * ```tsx
 * useInterval(() => {
 *   console.log('Tick');
 * }, 1000);
 * 
 * // Остановить интервал
 * useInterval(() => {
 *   console.log('This will never run');
 * }, null);
 * ```
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  // Сохраняем последний callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Настраиваем интервал
  useEffect(() => {
    // Не запускаем если delay === null
    if (delay === null) {
      return;
    }

    const tick = () => {
      savedCallback.current?.();
    };

    const id = setInterval(tick, delay);

    // Cleanup при unmount или изменении delay
    return () => clearInterval(id);
  }, [delay]);
}
