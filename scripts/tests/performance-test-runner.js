/**
 * АВТОМАТИЧЕСКИЙ ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ
 * Запускается в консоли браузера на странице игры
 */

class PerformanceTestRunner {
    constructor() {
        this.testResults = {
            testId: `perf_test_${Date.now()}`,
            startTime: Date.now(),
            duration: 0,
            samples: [],
            summary: {},
            recommendations: []
        };

        this.isRunning = false;
        this.sampleInterval = null;
        this.testDuration = 60000; // 1 минута
    }

    async runPerformanceTest() {
        console.log('🚀 ЗАПУСК ТЕСТА ПРОИЗВОДИТЕЛЬНОСТИ');
        console.log('='.repeat(50));

        if (this.isRunning) {
            console.log('❌ Тест уже запущен');
            return;
        }

        this.isRunning = true;
        this.testResults.startTime = Date.now();

        // Проверяем доступность игровых объектов
        if (!this.checkGameAvailability()) {
            console.log('❌ Игра не готова для тестирования');
            return;
        }

        console.log('✅ Игра готова, начинаем тестирование...');
        console.log(`⏱️ Длительность теста: ${this.testDuration / 1000} секунд`);

        // Запускаем сбор метрик
        this.startMetricsCollection();

        // Симулируем игровую активность
        this.simulateGameplay();

        // Ждем завершения теста
        await new Promise(resolve => {
            setTimeout(() => {
                this.stopTest();
                resolve();
            }, this.testDuration);
        });

        // Анализируем результаты
        this.analyzeResults();
        this.generateRecommendations();
        this.printResults();

        return this.testResults;
    }

    checkGameAvailability() {
        const canvas = document.querySelector('canvas[data-testid="game-canvas"]');
        const store = window.__TOLOVERUNNER_STORE__;
        const renderer = window.__TOLOVERUNNER_RENDERER__;
        const perfMonitor = window.__TOLOVERUNNER_PERFORMANCE__;

        console.log('🔍 Проверка компонентов игры:');
        console.log(`Canvas: ${canvas ? '✅' : '❌'}`);
        console.log(`Store: ${store ? '✅' : '❌'}`);
        console.log(`Renderer: ${renderer ? '✅' : '❌'}`);
        console.log(`Performance Monitor: ${perfMonitor ? '✅' : '❌'}`);

        return !!(canvas && store && renderer && perfMonitor);
    }

    startMetricsCollection() {
        console.log('📊 Запуск сбора метрик...');

        this.sampleInterval = setInterval(() => {
            this.collectSample();
        }, 1000); // Каждую секунду
    }

    collectSample() {
        const timestamp = Date.now() - this.testResults.startTime;

        // FPS
        const perfMonitor = window.__TOLOVERUNNER_PERFORMANCE__;
        const fps = perfMonitor ? perfMonitor.currentFPS : 0;

        // Память
        const memory = performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null;

        // Renderer info
        const renderer = window.__TOLOVERUNNER_RENDERER__;
        const renderInfo = renderer ? {
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            points: renderer.info.render.points,
            lines: renderer.info.render.lines
        } : null;

        // GPU info (если доступно)
        const gpuInfo = this.getGPUInfo();

        const sample = {
            timestamp,
            fps,
            memory,
            renderInfo,
            gpuInfo
        };

        this.testResults.samples.push(sample);

        // Выводим прогресс каждые 10 секунд
        if (timestamp % 10000 < 1000) {
            const progress = Math.round((timestamp / this.testDuration) * 100);
            console.log(`📈 Прогресс: ${progress}% | FPS: ${fps} | Память: ${memory ? memory.used + 'MB' : 'N/A'}`);
        }
    }

    getGPUInfo() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;

        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return null;

        return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        };
    }

    simulateGameplay() {
        console.log('🤖 Запуск симуляции геймплея...');

        const store = window.__TOLOVERUNNER_STORE__;
        if (!store) return;

        // Запускаем игру если не запущена
        const state = store.getState();
        if (state.status !== 'PLAYING') {
            if (state.startGame) {
                state.startGame();
            }
        }

        // Симулируем случайные действия игрока
        const actions = ['ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft'];

        const simulateAction = () => {
            if (!this.isRunning) return;

            const action = actions[Math.floor(Math.random() * actions.length)];

            // Симулируем нажатие клавиши
            const keyDown = new KeyboardEvent('keydown', {
                key: action,
                code: action,
                bubbles: true
            });
            document.dispatchEvent(keyDown);

            // Отпускаем клавишу через случайное время
            setTimeout(() => {
                const keyUp = new KeyboardEvent('keyup', {
                    key: action,
                    code: action,
                    bubbles: true
                });
                document.dispatchEvent(keyUp);
            }, Math.random() * 200 + 50);

            // Следующее действие через случайное время
            setTimeout(simulateAction, Math.random() * 2000 + 500);
        };

        // Начинаем симуляцию
        setTimeout(simulateAction, 1000);
    }

    stopTest() {
        console.log('⏹️ Остановка теста...');

        this.isRunning = false;

        if (this.sampleInterval) {
            clearInterval(this.sampleInterval);
            this.sampleInterval = null;
        }

        this.testResults.duration = Date.now() - this.testResults.startTime;
    }

    analyzeResults() {
        console.log('🔍 Анализ результатов...');

        const samples = this.testResults.samples;
        if (samples.length === 0) return;

        // Анализ FPS
        const fpsValues = samples.map(s => s.fps).filter(fps => fps > 0);
        const fpsStats = {
            min: Math.min(...fpsValues),
            max: Math.max(...fpsValues),
            avg: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
            stability: this.calculateStability(fpsValues)
        };

        // Анализ памяти
        const memoryValues = samples.map(s => s.memory?.used).filter(m => m != null);
        const memoryStats = memoryValues.length > 0 ? {
            min: Math.min(...memoryValues),
            max: Math.max(...memoryValues),
            avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
            growth: memoryValues[memoryValues.length - 1] - memoryValues[0],
            leakDetected: this.detectMemoryLeak(memoryValues)
        } : null;

        // Анализ рендеринга
        const drawCallsValues = samples.map(s => s.renderInfo?.drawCalls).filter(d => d != null);
        const trianglesValues = samples.map(s => s.renderInfo?.triangles).filter(t => t != null);

        const renderStats = drawCallsValues.length > 0 ? {
            avgDrawCalls: drawCallsValues.reduce((a, b) => a + b, 0) / drawCallsValues.length,
            avgTriangles: trianglesValues.reduce((a, b) => a + b, 0) / trianglesValues.length,
            maxDrawCalls: Math.max(...drawCallsValues),
            maxTriangles: Math.max(...trianglesValues)
        } : null;

        this.testResults.summary = {
            fps: fpsStats,
            memory: memoryStats,
            rendering: renderStats,
            sampleCount: samples.length,
            testDuration: this.testResults.duration
        };
    }

    calculateStability(values) {
        if (values.length < 2) return 1;

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Стабильность как обратная величина коэффициента вариации
        return Math.max(0, 1 - (stdDev / avg));
    }

    detectMemoryLeak(memoryValues) {
        if (memoryValues.length < 10) return false;

        // Проверяем тренд роста памяти
        const firstHalf = memoryValues.slice(0, Math.floor(memoryValues.length / 2));
        const secondHalf = memoryValues.slice(Math.floor(memoryValues.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        // Утечка если память выросла более чем на 20MB
        return (secondAvg - firstAvg) > 20;
    }

    generateRecommendations() {
        const summary = this.testResults.summary;
        const recommendations = [];

        // Рекомендации по FPS
        if (summary.fps) {
            if (summary.fps.avg < 30) {
                recommendations.push({
                    type: 'critical',
                    category: 'performance',
                    message: `Критично низкий FPS: ${summary.fps.avg.toFixed(1)}. Требуется серьезная оптимизация.`
                });
            } else if (summary.fps.avg < 50) {
                recommendations.push({
                    type: 'warning',
                    category: 'performance',
                    message: `Низкий FPS: ${summary.fps.avg.toFixed(1)}. Рекомендуется оптимизация.`
                });
            }

            if (summary.fps.stability < 0.8) {
                recommendations.push({
                    type: 'warning',
                    category: 'performance',
                    message: `Нестабильный FPS (стабильность: ${(summary.fps.stability * 100).toFixed(1)}%). Проверьте оптимизацию рендеринга.`
                });
            }
        }

        // Рекомендации по памяти
        if (summary.memory) {
            if (summary.memory.leakDetected) {
                recommendations.push({
                    type: 'critical',
                    category: 'memory',
                    message: `Обнаружена утечка памяти: рост на ${summary.memory.growth}MB за тест.`
                });
            }

            if (summary.memory.max > 500) {
                recommendations.push({
                    type: 'warning',
                    category: 'memory',
                    message: `Высокое потребление памяти: ${summary.memory.max}MB. Рассмотрите оптимизацию ресурсов.`
                });
            }
        }

        // Рекомендации по рендерингу
        if (summary.rendering) {
            if (summary.rendering.avgDrawCalls > 1000) {
                recommendations.push({
                    type: 'warning',
                    category: 'rendering',
                    message: `Много draw calls: ${summary.rendering.avgDrawCalls.toFixed(0)}. Рассмотрите batching.`
                });
            }

            if (summary.rendering.avgTriangles > 100000) {
                recommendations.push({
                    type: 'info',
                    category: 'rendering',
                    message: `Высокое количество треугольников: ${summary.rendering.avgTriangles.toFixed(0)}. Проверьте LOD системы.`
                });
            }
        }

        this.testResults.recommendations = recommendations;
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 РЕЗУЛЬТАТЫ ТЕСТА ПРОИЗВОДИТЕЛЬНОСТИ');
        console.log('='.repeat(60));

        const summary = this.testResults.summary;

        console.log(`⏱️ Длительность теста: ${(this.testResults.duration / 1000).toFixed(1)} секунд`);
        console.log(`📈 Собрано образцов: ${summary.sampleCount}`);

        if (summary.fps) {
            console.log('\n🎯 ПРОИЗВОДИТЕЛЬНОСТЬ FPS:');
            console.log(`  Средний FPS: ${summary.fps.avg.toFixed(1)}`);
            console.log(`  Минимальный FPS: ${summary.fps.min}`);
            console.log(`  Максимальный FPS: ${summary.fps.max}`);
            console.log(`  Стабильность: ${(summary.fps.stability * 100).toFixed(1)}%`);

            // Оценка FPS
            let fpsGrade = 'ОТЛИЧНО';
            if (summary.fps.avg < 30) fpsGrade = 'КРИТИЧНО';
            else if (summary.fps.avg < 50) fpsGrade = 'ПЛОХО';
            else if (summary.fps.avg < 55) fpsGrade = 'УДОВЛЕТВОРИТЕЛЬНО';
            else if (summary.fps.avg < 58) fpsGrade = 'ХОРОШО';

            console.log(`  Оценка: ${fpsGrade}`);
        }

        if (summary.memory) {
            console.log('\n💾 ИСПОЛЬЗОВАНИЕ ПАМЯТИ:');
            console.log(`  Среднее: ${summary.memory.avg.toFixed(1)} MB`);
            console.log(`  Минимум: ${summary.memory.min} MB`);
            console.log(`  Максимум: ${summary.memory.max} MB`);
            console.log(`  Рост за тест: ${summary.memory.growth} MB`);
            console.log(`  Утечка памяти: ${summary.memory.leakDetected ? '❌ ОБНАРУЖЕНА' : '✅ НЕТ'}`);
        }

        if (summary.rendering) {
            console.log('\n🎨 РЕНДЕРИНГ:');
            console.log(`  Средние draw calls: ${summary.rendering.avgDrawCalls.toFixed(0)}`);
            console.log(`  Средние треугольники: ${summary.rendering.avgTriangles.toFixed(0)}`);
            console.log(`  Максимум draw calls: ${summary.rendering.maxDrawCalls}`);
            console.log(`  Максимум треугольников: ${summary.rendering.maxTriangles}`);
        }

        console.log('\n💡 РЕКОМЕНДАЦИИ:');
        if (this.testResults.recommendations.length === 0) {
            console.log('  ✅ Производительность в норме, рекомендаций нет');
        } else {
            this.testResults.recommendations.forEach(rec => {
                const icon = rec.type === 'critical' ? '🔴' : rec.type === 'warning' ? '🟡' : '🔵';
                console.log(`  ${icon} ${rec.message}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Тест завершен. Результаты сохранены в window.__PERFORMANCE_TEST_RESULTS__');

        // Сохраняем результаты в глобальную переменную
        window.__PERFORMANCE_TEST_RESULTS__ = this.testResults;
    }
}

// Автоматический запуск теста
console.log('🚀 Инициализация теста производительности...');

// Проверяем готовность страницы
if (document.readyState === 'complete') {
    startTest();
} else {
    window.addEventListener('load', startTest);
}

async function startTest() {
    // Дополнительная задержка для полной инициализации игры
    await new Promise(resolve => setTimeout(resolve, 3000));

    const testRunner = new PerformanceTestRunner();
    await testRunner.runPerformanceTest();
}

// Экспорт для ручного запуска
window.runPerformanceTest = async function () {
    const testRunner = new PerformanceTestRunner();
    return await testRunner.runPerformanceTest();
};
