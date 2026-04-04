/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * errorHandler - Утилиты для безопасной обработки ошибок
 */

import * as React from 'react';

/**
 * Безопасное выполнение функции с обработкой ошибок
 */
export const safeExecute = <T>(
    fn: () => T,
    fallback: T,
    errorMessage?: string
): T => {
    try {
        return fn();
    } catch (error) {
        if (import.meta.env.DEV && errorMessage) {
            console.warn(errorMessage, error);
        }
        return fallback;
    }
};

/**
 * Безопасное выполнение асинхронной функции
 */
export const safeExecuteAsync = async <T>(
    fn: () => Promise<T>,
    fallback: T,
    errorMessage?: string
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (import.meta.env.DEV && errorMessage) {
            console.warn(errorMessage, error);
        }
        return fallback;
    }
};

/**
 * Безопасное обновление ref с проверкой на существование
 */
export const safeRefUpdate = <T>(
    ref: React.RefObject<T>,
    updater: (value: T) => void
): boolean => {
    if (ref.current) {
        try {
            updater(ref.current);
            return true;
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn('Error updating ref:', error);
            }
            return false;
        }
    }
    return false;
};

/**
 * Безопасное выполнение dispose с проверками
 */
export const safeDispose = (obj: { dispose?: () => void } | null | undefined): void => {
    if (!obj || !obj.dispose) return;
    try {
        obj.dispose();
    } catch (error) {
        if (import.meta.env.DEV) {
            console.warn('Error disposing object:', error);
        }
    }
};

