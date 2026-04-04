/**
 * @license SPDX-License-Identifier: Apache-2.0
 * 
 * Ref Safety Helper - Безопасная работа с React refs
 */

import { RefObject } from 'react';
import { debugLog } from './debug';

export class RefSafetyHelper {
    /**
     * Безопасная проверка одного ref
     */
    static isValid<T>(ref: RefObject<T>): ref is RefObject<NonNullable<T>> {
        return ref.current !== null && ref.current !== undefined;
    }

    /**
     * Безопасная проверка множественных refs
     */
    static areValid<T extends Record<string, RefObject<any>>>(refs: T): boolean {
        return Object.values(refs).every(ref => RefSafetyHelper.isValid(ref));
    }

    /**
     * Безопасное выполнение операции с ref
     */
    static withRef<T, R>(
        ref: RefObject<T>, 
        operation: (value: NonNullable<T>) => R,
        fallback?: R
    ): R | undefined {
        if (RefSafetyHelper.isValid(ref)) {
            try {
                return operation(ref.current as NonNullable<T>);
            } catch (error) {
                debugLog('RefSafetyHelper: Error in ref operation:', error);
                return fallback;
            }
        }
        return fallback;
    }

    /**
     * Безопасное выполнение операции с множественными refs
     */
    static withRefs<T extends Record<string, RefObject<any>>, R>(
        refs: T,
        operation: (validRefs: { [K in keyof T]: NonNullable<T[K]['current']> }) => R,
        fallback?: R
    ): R | undefined {
        if (RefSafetyHelper.areValid(refs)) {
            try {
                const validRefs = Object.fromEntries(
                    Object.entries(refs).map(([key, ref]) => [key, ref.current])
                ) as { [K in keyof T]: NonNullable<T[K]['current']> };
                
                return operation(validRefs);
            } catch (error) {
                debugLog('RefSafetyHelper: Error in multi-ref operation:', error);
                return fallback;
            }
        }
        return fallback;
    }

    /**
     * Создает безопасный callback для refs
     */
    static createSafeCallback<T>(
        ref: RefObject<T>,
        callback: (value: NonNullable<T>) => void
    ): () => void {
        return () => {
            RefSafetyHelper.withRef(ref, callback);
        };
    }

    /**
     * Проверяет ref с детальным логированием
     */
    static validateRef<T>(ref: RefObject<T>, name: string): boolean {
        const isValid = RefSafetyHelper.isValid(ref);
        if (!isValid) {
            debugLog(`RefSafetyHelper: Invalid ref '${name}' - current is ${ref.current}`);
        }
        return isValid;
    }
}

// Хук для использования в React компонентах
export function useRefSafety() {
    return {
        isValid: RefSafetyHelper.isValid,
        areValid: RefSafetyHelper.areValid,
        withRef: RefSafetyHelper.withRef,
        withRefs: RefSafetyHelper.withRefs,
        createSafeCallback: RefSafetyHelper.createSafeCallback,
        validateRef: RefSafetyHelper.validateRef
    };
}