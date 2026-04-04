@echo off
echo 🚀 ToLOVERunner v2.4.0 - Быстрый запуск
echo =====================================
echo.

REM Проверяем наличие .env файла
if not exist ".env" (
    echo ⚠️  Файл .env не найден
    if exist ".env.example" (
        echo 📋 Копируем .env.example в .env...
        copy .env.example .env >nul
        echo ✅ Файл .env создан. Проверьте настройки перед продакшеном.
    ) else (
        echo ❌ Файл .env.example не найден. Создайте .env вручную.
    )
    echo.
)

REM Проверяем наличие pnpm (самый быстрый)
where pnpm >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo ⚡ Используем PNPM для максимальной скорости...
    pnpm install --frozen-lockfile --prefer-offline
    if %ERRORLEVEL% == 0 (
        echo ✅ Зависимости установлены через PNPM
        echo 🎮 Запускаем игру...
        pnpm dev
        goto :end
    )
)

REM Проверяем наличие yarn
where yarn >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo ⚡ Используем Yarn для быстрой установки...
    yarn install --frozen-lockfile --prefer-offline
    if %ERRORLEVEL% == 0 (
        echo ✅ Зависимости установлены через Yarn
        echo 🎮 Запускаем игру...
        yarn dev
        goto :end
    )
)

REM Проверяем наличие bun (очень быстрый)
where bun >nul 2>nul
if %ERRORLEVEL% == 0 (
    echo ⚡ Используем Bun для сверхбыстрой установки...
    bun install
    if %ERRORLEVEL% == 0 (
        echo ✅ Зависимости установлены через Bun
        echo 🎮 Запускаем игру...
        bun dev
        goto :end
    )
)

REM Fallback на npm с оптимизацией
echo ⚡ Используем NPM с оптимизацией...
npm install --prefer-offline --no-audit --no-fund
if %ERRORLEVEL% == 0 (
    echo ✅ Зависимости установлены через NPM
    echo 🎮 Запускаем игру...
    npm run dev
) else (
    echo ❌ Ошибка установки зависимостей
    pause
)

:end
echo.
echo 🎯 Игра откроется в браузере (обычно http://localhost:3000)
echo 💡 Если порт 3000 занят, Vite автоматически выберет другой
echo 📝 Нажмите F3 в игре для отладочной информации
echo 🎮 Управление: WASD/Стрелки + Пробел для прыжка
pause