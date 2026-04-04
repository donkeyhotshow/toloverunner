/**
 * useResponsive Hook - Адаптивный UI для разных размеров экрана
 * 
 * Определяет текущий размер экрана и предоставляет утилиты для адаптации UI
 */

import { useState, useEffect } from 'react';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveConfig {
    screenSize: ScreenSize;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    uiScale: number;
    vfxScale: number;
}

/**
 * Определяет размер экрана и возвращает конфигурацию для адаптивного UI
 */
export const useResponsive = (): ResponsiveConfig => {
    const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

    useEffect(() => {
        const updateScreenSize = () => {
            const width = window.innerWidth;

            // Определяем тип устройства
            if (width < 768) {
                setScreenSize('mobile');
            } else if (width < 1024) {
                setScreenSize('tablet');
            } else {
                setScreenSize('desktop');
            }
        };

        // Инициализация
        updateScreenSize();

        // Слушаем изменения размера окна с debounce
        let timeoutId: any;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(updateScreenSize, 150);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Вычисляем конфигурацию на основе размера экрана
    const config: ResponsiveConfig = {
        screenSize,
        isMobile: screenSize === 'mobile',
        isTablet: screenSize === 'tablet',
        isDesktop: screenSize === 'desktop',
        uiScale: screenSize === 'mobile' ? 0.7 : screenSize === 'tablet' ? 0.85 : 1.0,
        vfxScale: screenSize === 'mobile' ? 0.6 : screenSize === 'tablet' ? 0.8 : 1.0,
    };

    return config;
};

/**
 * Утилита для получения адаптивного значения
 */
export const getResponsiveValue = <T,>(
    screenSize: ScreenSize,
    mobile: T,
    tablet: T,
    desktop: T
): T => {
    switch (screenSize) {
        case 'mobile':
            return mobile;
        case 'tablet':
            return tablet;
        case 'desktop':
            return desktop;
    }
};
