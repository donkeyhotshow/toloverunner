/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Logger - Безопасное логирование, которое работает только в development
 * 
 * Использование:
 * ```typescript
 * import { logger } from './utils/logger';
 * 
 * logger.log('Message');
 * logger.warn('Warning');
 * logger.error('Error');
 * ```
 */

const envObj = (typeof (import.meta as any).env !== 'undefined') ? (import.meta as any).env : {};
const isDevelopment =
    envObj.MODE === 'development' ||
    envObj.VITE_NODE_ENV === 'development' ||
    // Allow test override from browser for special CI cases
    (typeof (window as any).__TOLOVERUNNER_DEV__ !== 'undefined' && (window as any).__TOLOVERUNNER_DEV__ === true);

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },
    
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },
    
    error: (...args: any[]) => {
        // Ошибки логируем всегда
        console.error(...args);
    },
    
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },
    
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },
    
    table: (data: any) => {
        if (isDevelopment) {
            console.table(data);
        }
    },
};



