/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Frame Throttling System - Глобальная система пропуска кадров
 * Позволяет тяжёлым компонентам обновляться не каждый кадр
 */

/**
 * Глобальный счётчик кадров
 */
let globalFrameCounter = 0;

/**
 * Обновить счётчик кадров (вызывается из RenderController)
 */
export function incrementFrameCounter(): void {
    globalFrameCounter++;
}

/**
 * Получить текущий номер кадра
 */
export function getFrameCounter(): number {
    return globalFrameCounter;
}

/**
 * Проверить, нужно ли обновлять компонент в текущем кадре
 * 
 * @param skipFrames Количество кадров для пропуска (2 = каждый 2-й кадр, 3 = каждый 3-й)
 * @param offset Смещение для распределения нагрузки между компонентами
 * @returns true если нужно обновлять
 * 
 * @example
 * ```ts
 * useFrame(() => {
 *   if (!shouldUpdateThisFrame(2)) return; // Обновляться каждый 2-й кадр
 *   // ... тяжёлые вычисления
 * });
 * ```
 */
export function shouldUpdateThisFrame(skipFrames: number = 1, offset: number = 0): boolean {
    return (globalFrameCounter + offset) % skipFrames === 0;
}

/**
 * Создать функцию проверки для конкретного компонента с уникальным offset
 * Это распределяет нагрузку между компонентами
 * 
 * @param skipFrames Количество кадров для пропуска
 * @returns Функция проверки
 * 
 * @example
 * ```ts
 * const shouldUpdate = createFrameThrottler(3); // Каждый 3-й кадр
 * useFrame(() => {
 *   if (!shouldUpdate()) return;
 *   // ... обновления
 * });
 * ```
 */
let componentCounter = 0;
export function createFrameThrottler(skipFrames: number = 1): () => boolean {
    const offset = componentCounter++;
    return () => shouldUpdateThisFrame(skipFrames, offset);
}

/**
 * Хук для использования throttling в компонентах
 * 
 * @param skipFrames Количество кадров для пропуска
 * @returns true если нужно обновлять в текущем кадре
 */
export function useFrameThrottle(skipFrames: number = 1): boolean {
    // Для хука нам не нужен offset, так как каждый вызов создаёт новый
    return shouldUpdateThisFrame(skipFrames);
}

/**
 * Сбросить счётчик (для тестирования)
 */
export function resetFrameCounter(): void {
    globalFrameCounter = 0;
    componentCounter = 0;
}
