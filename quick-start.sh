#!/bin/bash

echo "🚀 ToLOVERunner v2.4.0 - Быстрый запуск"
echo "====================================="
echo ""

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Файл .env не найден"
    if [ -f ".env.example" ]; then
        echo "📋 Копируем .env.example в .env..."
        cp .env.example .env
        echo "✅ Файл .env создан. Проверьте настройки перед продакшеном."
    else
        echo "❌ Файл .env.example не найден. Создайте .env вручную."
    fi
    echo ""
fi

# Функция для проверки команды
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Проверяем наличие pnpm (самый быстрый)
if command_exists pnpm; then
    echo "⚡ Используем PNPM для максимальной скорости..."
    pnpm install --frozen-lockfile --prefer-offline
    if [ $? -eq 0 ]; then
        echo "✅ Зависимости установлены через PNPM"
        echo "🎮 Запускаем игру..."
        pnpm dev
        exit 0
    fi
fi

# Проверяем наличие yarn
if command_exists yarn; then
    echo "⚡ Используем Yarn для быстрой установки..."
    yarn install --frozen-lockfile --prefer-offline
    if [ $? -eq 0 ]; then
        echo "✅ Зависимости установлены через Yarn"
        echo "🎮 Запускаем игру..."
        yarn dev
        exit 0
    fi
fi

# Проверяем наличие bun (очень быстрый)
if command_exists bun; then
    echo "⚡ Используем Bun для сверхбыстрой установки..."
    bun install
    if [ $? -eq 0 ]; then
        echo "✅ Зависимости установлены через Bun"
        echo "🎮 Запускаем игру..."
        bun dev
        exit 0
    fi
fi

# Fallback на npm с оптимизацией
if command_exists npm; then
    echo "⚡ Используем NPM с оптимизацией..."
    npm install --prefer-offline --no-audit --no-fund
    if [ $? -eq 0 ]; then
        echo "✅ Зависимости установлены через NPM"
        echo "🎮 Запускаем игру..."
        npm run dev
        exit 0
    else
        echo "❌ Ошибка установки зависимостей"
        exit 1
    fi
else
    echo "❌ Не найден ни один пакетный менеджер (npm, yarn, pnpm, bun)"
    exit 1
fi