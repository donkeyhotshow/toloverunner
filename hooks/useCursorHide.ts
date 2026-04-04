/**
 * useCursorHide - Скрывает системный курсор во время геймплея
 * 
 * Согласно рекомендациям: "Убедитесь, что в режиме геймплея системный курсор мыши скрыт"
 */

import { useEffect } from 'react';

export const useCursorHide = (isGameActive: boolean = true) => {
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const originalCursor = document.body.style.cursor;

        if (isGameActive) {
            // 🎯 Скрываем курсор в режиме геймплея
            document.body.style.cursor = 'none';
        } else {
            // Возвращаем дефолтный курсор в меню/паузе
            document.body.style.cursor = 'default';
        }

        return () => {
            // Cleanup: восстанавливаем оригинальный курсор
            document.body.style.cursor = originalCursor;
        };
    }, [isGameActive]);
};

export default useCursorHide;
