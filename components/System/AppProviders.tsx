/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * AppProviders — top-level React provider wrapper extracted from App.tsx.
 *
 * Bundles all context/error-boundary providers so that App.tsx stays focused
 * on routing and scene orchestration.
 *
 * Provider stack (outer → inner):
 *   GameSystemsProvider   — DI for core game managers (audio, physics, etc.)
 *   StableErrorBoundary   — catches catastrophic render errors
 *   UIErrorBoundary       — catches UI-layer errors and shows fallback HUD
 */

import React from 'react';
import { GameSystemsProvider } from '../../infrastructure/context/GameSystemsContext';
import { StableErrorBoundary } from './StableErrorBoundary';
import { UIErrorBoundary } from './UIErrorBoundary';

interface AppProvidersProps {
    children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => (
    <GameSystemsProvider>
        <StableErrorBoundary>
            <UIErrorBoundary>
                {children}
            </UIErrorBoundary>
        </StableErrorBoundary>
    </GameSystemsProvider>
);
