/**
 * EnhancedHUD - OPTIMIZED VERSION
 * Минимальные обновления, только по необходимости
 */

import React from 'react';
import { getPerformanceManager } from '../../infrastructure/performance/PerformanceManager';

const FPSDisplay = React.memo(() => {
    const [fps, setFps] = React.useState(60);
    
    React.useEffect(() => {
        const perfManager = getPerformanceManager();
        
        // Обновляем FPS только раз в секунду
        const interval = setInterval(() => {
            const metrics = perfManager.getMetrics();
            setFps(metrics.fps);
        }, 1000);
        
        return () => clearInterval(interval);
    }, []);
    
    return (
        <div className="bg-black/70 px-3 py-1 rounded text-xs">
            FPS: <span className={fps < 30 ? 'text-red-500' : 'text-green-500'}>
                {fps}
            </span>
        </div>
    );
});
FPSDisplay.displayName = 'FPSDisplay';

export const EnhancedHUD: React.FC<{ showAdvancedInfo?: boolean }> = React.memo(({ showAdvancedInfo = false }) => {
    if (!showAdvancedInfo) return null;
    
    return (
        <div className="absolute bottom-4 right-4 pointer-events-none">
            <FPSDisplay />
        </div>
    );
});

EnhancedHUD.displayName = 'EnhancedHUD';
