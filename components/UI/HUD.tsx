/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { useIsGameActive } from '../../hooks/useIsPlaying';
import { UI_LAYERS } from '../../constants';

// Comic HUD Components
import { ComicTopBar } from './ComicHUD/ComicTopBar';
import { ComicLeftPanel } from './ComicHUD/ComicLeftPanel';
import { ComicRightPanel } from './ComicHUD/ComicRightPanel';

// Feedback & Overlays
import { PerfectTimingIndicator } from './HUD/PerfectTimingIndicator';
import { JumpPopup } from './HUD/JumpPopup';
import { MobileControls } from './HUD/MobileControls';
import { CountdownScreen } from './CountdownScreen';
import { PauseScreen } from './HUD/PauseScreen';
import { GameOverScreen } from './HUD/GameOverScreen';
import { VictoryScreen } from './HUD/VictoryScreen';
import { ShopScreen } from './HUD/ShopScreen';
import { MainMenuScreen } from './HUD/MainMenuScreen';
import { ComicFeedback } from './ComicFeedback';
import { GrazeFeedback } from './GrazeFeedback';
import { ComboDisplay } from './HUD/ComboDisplay';

// Simple screen wrapper with CSS transition
const ScreenTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full h-full flex items-center justify-center pointer-events-auto animate-fade-in">
        {children}
    </div>
);

export const HUD: React.FC = React.memo(() => {
    const status = useStore(s => s.status);
    const zenMode = useStore(s => s.zenMode);
    const showPopups = useStore(s => s.showPopups);
    const isGameActive = useIsGameActive();

    // if (status !== GameStatus.PLAYING || zenMode) return null; // REMOVED: Breaks menu



    return (
        <>
            {/* Gameplay UI Layer */}
            <div
                className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-300 ease-out"
                style={{
                    zIndex: UI_LAYERS.HUD,
                    opacity: (isGameActive || status === GameStatus.COUNTDOWN) && !zenMode ? 1 : 0,
                    visibility: (isGameActive || status === GameStatus.COUNTDOWN) && !zenMode ? 'visible' : 'hidden',
                    transition: 'opacity 0.25s ease-out',
                }}

                data-status={status}
                data-active={isGameActive ? 'true' : 'false'}
            >
                {/* HUD Elements */}
                <ComicTopBar />
                <ComicLeftPanel />
                <ComicRightPanel />

                {/* Feedback Overlays */}
                {showPopups && (
                    <>
                        <PerfectTimingIndicator />
                        <JumpPopup />
                        <ComicFeedback />
                        <GrazeFeedback />
                        <ComboDisplay />
                    </>
                )}

                {/* Mobile controls only for touch devices */}
                {'ontouchstart' in window && <MobileControls />}
            </div>

            {/* Screen Overlays */}
            <div
                className="absolute inset-0"
                style={{
                    zIndex: UI_LAYERS.MODAL,
                    pointerEvents: (status === GameStatus.MENU || status === GameStatus.GAME_OVER || status === GameStatus.VICTORY || status === GameStatus.PAUSED || status === GameStatus.SHOP) ? 'auto' : 'none',
                }}
            >
                {status === GameStatus.MENU && (
                    <ScreenTransition>
                        <MainMenuScreen />
                    </ScreenTransition>
                )}

                {status === GameStatus.SHOP && (
                    <ScreenTransition>
                        <ShopScreen />
                    </ScreenTransition>
                )}

                {status === GameStatus.GAME_OVER && (
                    <ScreenTransition>
                        <GameOverScreen />
                    </ScreenTransition>
                )}

                {status === GameStatus.VICTORY && (
                    <ScreenTransition>
                        <VictoryScreen />
                    </ScreenTransition>
                )}

                {status === GameStatus.COUNTDOWN && (
                    <CountdownScreen onComplete={() => useStore.getState().startGameplay()} />
                )}

                {status === GameStatus.PAUSED && (
                    <ScreenTransition>
                        <PauseScreen />
                    </ScreenTransition>
                )}
            </div>
        </>
    );
});

HUD.displayName = 'HUD';
