/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Adaptive Mobile Controls - Адаптивное мобильное управление
 * Fixed: White Glass Style, Transparent, Non-obstructive
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { useGestures, useAudio, useAccessibility } from '../../hooks/useCoreSystems';
import { type GestureData } from '../../core';

interface AdaptiveMobileControlsProps {
    onJump?: () => void;
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    onDash?: () => void;
}

export const AdaptiveMobileControls: React.FC<AdaptiveMobileControlsProps> = ({
    onJump,
    onMoveLeft,
    onMoveRight,
    onDash
}) => {
    const status = useStore(s => s.status);
    const dash = useStore(s => s.dash);
    const dashCooldown = useStore(s => s.dashCooldown);
    const setLocalPlayerState = useStore(s => s.setLocalPlayerState);

    const { isMobile, scaleFactor: _scaleFactor, getAdaptiveSize, onGesture } = useGestures();
    const { playSFX } = useAudio();
    const { settings: a11ySettings, getAriaAttributes } = useAccessibility();

    const [currentLane, setCurrentLane] = useState(0);
    const [isJumpPressed, setIsJumpPressed] = useState(false);
    const [isLeftPressed, setIsLeftPressed] = useState(false);
    const [isRightPressed, setIsRightPressed] = useState(false);

    // Адаптивные размеры (Reduced for less obstruction)
    const sizes = useMemo(() => ({
        buttonSize: getAdaptiveSize(70),
        jumpButtonSize: getAdaptiveSize(90),
        iconSize: getAdaptiveSize(32),
        jumpIconSize: getAdaptiveSize(48),
        padding: getAdaptiveSize(20),
        gap: getAdaptiveSize(24),
        bottomOffset: getAdaptiveSize(24)
    }), [getAdaptiveSize]);

    // Обработчики действий
    const handleJump = useCallback(() => {
        if (status !== GameStatus.PLAYING) return;

        setLocalPlayerState({ isJumping: true });
        playSFX('jump');
        onJump?.();

        // Визуальная обратная связь
        setIsJumpPressed(true);
        setTimeout(() => setIsJumpPressed(false), 150);
    }, [status, setLocalPlayerState, playSFX, onJump]);

    const handleMoveLeft = useCallback(() => {
        if (status !== GameStatus.PLAYING) return;

        const newLane = Math.max(-2, currentLane - 1);
        if (newLane !== currentLane) {
            setCurrentLane(newLane);
            setLocalPlayerState({ lane: newLane });
            playSFX('swipe');
            onMoveLeft?.();
        }

        setIsLeftPressed(true);
        setTimeout(() => setIsLeftPressed(false), 150);
    }, [status, currentLane, setLocalPlayerState, playSFX, onMoveLeft]);

    const handleMoveRight = useCallback(() => {
        if (status !== GameStatus.PLAYING) return;

        const newLane = Math.min(2, currentLane + 1);
        if (newLane !== currentLane) {
            setCurrentLane(newLane);
            setLocalPlayerState({ lane: newLane });
            playSFX('swipe');
            onMoveRight?.();
        }

        setIsRightPressed(true);
        setTimeout(() => setIsRightPressed(false), 150);
    }, [status, currentLane, setLocalPlayerState, playSFX, onMoveRight]);

    const handleDash = useCallback(() => {
        if (status !== GameStatus.PLAYING || dashCooldown > 0) return;

        dash();
        playSFX('dash');
        onDash?.();
    }, [status, dashCooldown, dash, playSFX, onDash]);

    // Подписка на жесты
    useEffect(() => {
        if (!isMobile || status !== GameStatus.PLAYING) return;

        const unsubscribeSwipeLeft = onGesture('swipeLeft', () => handleMoveLeft());
        const unsubscribeSwipeRight = onGesture('swipeRight', () => handleMoveRight());
        const unsubscribeSwipeUp = onGesture('swipeUp', () => handleJump());
        const unsubscribeSwipeDown = onGesture('swipeDown', () => handleDash());
        const unsubscribeTap = onGesture('tap', (data: GestureData) => {
            // Тап в верхней половине экрана - прыжок
            const screenHeight = window.innerHeight;
            if (data.startY < screenHeight * 0.5) {
                handleJump();
            }
        });
        const unsubscribeDoubleTap = onGesture('doubleTap', () => handleDash());

        return () => {
            unsubscribeSwipeLeft();
            unsubscribeSwipeRight();
            unsubscribeSwipeUp();
            unsubscribeSwipeDown();
            unsubscribeTap();
            unsubscribeDoubleTap();
        };
    }, [isMobile, status, onGesture, handleMoveLeft, handleMoveRight, handleJump, handleDash]);

    // Не показываем на десктопе
    if (!isMobile) return null;

    // Не показываем если не играем
    if (status !== GameStatus.PLAYING) return null;

    const shouldReduceMotion = a11ySettings.reducedMotion;

    // Helper style for Glass UI
    const glassStyle = "bg-white/30 backdrop-blur-md border-2 border-white/50 shadow-lg flex items-center justify-center";

    return (
        <div
            className="absolute inset-x-0 flex flex-col items-center pointer-events-none z-50 select-none"
            style={{ bottom: sizes.bottomOffset }}
        >
            {/* Основные контролы */}
            <div
                className="pointer-events-auto flex items-end justify-center w-full max-w-md px-4"
                style={{ gap: sizes.gap }}
            >
                {/* Левая кнопка */}
                <motion.button
                    onPointerDown={(e) => { e.preventDefault(); handleMoveLeft(); }}
                    className={`${glassStyle} rounded-full`}
                    style={{
                        width: sizes.buttonSize,
                        height: sizes.buttonSize
                    }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9, backgroundColor: "rgba(255,255,255,0.5)" }}
                    animate={shouldReduceMotion ? {} : {
                        scale: isLeftPressed ? 0.9 : 1
                    }}
                    {...getAriaAttributes('leftButton')}
                >
                    <ArrowLeft
                        style={{ width: sizes.iconSize, height: sizes.iconSize }}
                        className="text-white"
                        strokeWidth={3}
                    />
                </motion.button>

                {/* Центральная кнопка - прыжок (GLASS, no green) */}
                <motion.button
                    onPointerDown={(e) => { e.preventDefault(); handleJump(); }}
                    className={`${glassStyle} rounded-full relative overflow-hidden`}
                    style={{
                        width: sizes.jumpButtonSize,
                        height: sizes.jumpButtonSize,
                        marginBottom: sizes.padding / 4
                    }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.85, backgroundColor: "rgba(255,255,255,0.5)" }}
                    animate={shouldReduceMotion ? {} : {
                        scale: isJumpPressed ? 0.85 : 1
                    }}
                    {...getAriaAttributes('jumpButton')}
                >
                    <ArrowUp
                        style={{ width: sizes.jumpIconSize, height: sizes.jumpIconSize }}
                        className="text-white drop-shadow-md relative z-10"
                        strokeWidth={3}
                    />
                </motion.button>

                {/* Правая кнопка */}
                <motion.button
                    onPointerDown={(e) => { e.preventDefault(); handleMoveRight(); }}
                    className={`${glassStyle} rounded-full`}
                    style={{
                        width: sizes.buttonSize,
                        height: sizes.buttonSize
                    }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.9, backgroundColor: "rgba(255,255,255,0.5)" }}
                    animate={shouldReduceMotion ? {} : {
                        scale: isRightPressed ? 0.9 : 1
                    }}
                    {...getAriaAttributes('rightButton')}
                >
                    <ArrowRight
                        style={{ width: sizes.iconSize, height: sizes.iconSize }}
                        className="text-white"
                        strokeWidth={3}
                    />
                </motion.button>
            </div>

            {/* Dash кнопка - также стилизуем под стекло */}
            <motion.button
                onPointerDown={(e) => { e.preventDefault(); handleDash(); }}
                className={`pointer-events-auto mt-4 rounded-full flex items-center justify-center shadow-xl ${glassStyle}`}
                style={{
                    width: sizes.buttonSize * 0.75,
                    height: sizes.buttonSize * 0.75,
                    opacity: dashCooldown > 0 ? 0.6 : 1,
                    cursor: dashCooldown > 0 ? 'not-allowed' : 'pointer'
                }}
                whileTap={dashCooldown > 0 || shouldReduceMotion ? {} : { scale: 0.9 }}
                aria-label={`Dash ${dashCooldown > 0 ? `(${dashCooldown.toFixed(1)}s)` : 'ready'}`}
                aria-disabled={dashCooldown > 0}
            >
                {dashCooldown > 0 ? (
                    <span className="text-white font-bold text-sm">
                        {dashCooldown.toFixed(1)}
                    </span>
                ) : (
                    <Zap
                        style={{ width: sizes.iconSize * 0.6, height: sizes.iconSize * 0.6 }}
                        className="text-white"
                        strokeWidth={3}
                    />
                )}
            </motion.button>

            {/* Подсказка по жестам (показывается первые несколько секунд) */}
            <GestureHint />
        </div>
    );
};

// Компонент подсказки по жестам
const GestureHint: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-[-80px] left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-4 py-2 rounded-lg backdrop-blur-sm"
            >
                <div className="flex flex-col items-center gap-1">
                    <span>👆 Tap to jump</span>
                    <span>👈👉 Swipe to move</span>
                    <span>👇 Swipe down to dash</span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AdaptiveMobileControls;
