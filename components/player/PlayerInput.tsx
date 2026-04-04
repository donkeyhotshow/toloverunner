/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

/**
 * Props for PlayerInput - headless input handler that notifies controller about actions.
 */
export interface PlayerInputProps {
    onMoveLeft?: () => void;
    onMoveRight?: () => void;
    onJump?: (isDouble?: boolean) => void;
    onUseAbility?: (ability: string) => void;
}

/**
 * Minimal/robust implementation of PlayerInput used by PlayerController.
 * Headless component: attaches keyboard handlers and calls callbacks.
 *
 * This intentionally renders nothing to keep input handling separate from visuals.
 */
export const PlayerInput: React.FC<PlayerInputProps> = ({
    onMoveLeft,
    onMoveRight,
    onJump,
    onUseAbility,
}) => {
    React.useEffect(() => {
        let lastJump = 0;
        let touchStartX = 0;
        let touchStartY = 0;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === "arrowleft" || key === "a") {
                onMoveLeft?.();
            } else if (key === "arrowright" || key === "d") {
                onMoveRight?.();
            } else if (key === " " || key === "spacebar" || key === "arrowup" || key === "w") {
                const now = Date.now();
                const isDouble = now - lastJump < 300;
                lastJump = now;
                onJump?.(isDouble);
            } else if (key === "arrowdown" || key === "s") {
                // Trigger slide or ability (mapped to ability_1 for now or custom event)
                // Assuming ability_1 is slide/dash for now based on context, or just emit a specific ability name 'slide'
                // But the interface suggests strictly defined abilities?
                // Let's use 'ability_1' as it is often Dash/Slide in runner games.
                // Or better: invoke onUseAbility('slide') and handle it in controller.
                onUseAbility?.("slide");
            } else if (key === "1") {
                onUseAbility?.("ability_1");
            } else if (key === "2") {
                onUseAbility?.("ability_2");
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t) {
                touchStartX = t.clientX;
                touchStartY = t.clientY;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartX || !touchStartY) return;
            const t = e.changedTouches[0];
            if (!t) return;
            const touchEndX = t.clientX;
            const touchEndY = t.clientY;

            const diffX = touchStartX - touchEndX;
            const diffY = touchStartY - touchEndY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal Swipe
                if (Math.abs(diffX) > 30) { // Threshold
                    if (diffX > 0) {
                        onMoveLeft?.();
                    } else {
                        onMoveRight?.();
                    }
                }
            } else {
                // Vertical Swipe
                if (Math.abs(diffY) > 30) {
                    if (diffY > 0) { // Swipe Up
                        const now = Date.now();
                        const isDouble = now - lastJump < 300;
                        lastJump = now;
                        onJump?.(isDouble);
                    }
                }
            }

            // Reset
            touchStartX = 0;
            touchStartY = 0;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchend", handleTouchEnd);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [onMoveLeft, onMoveRight, onJump, onUseAbility]);

    return null;
};

export default PlayerInput;


