/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UI_LAYERS } from '../../constants';

export const VintageOverlay: React.FC = () => {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 select-none" style={{ zIndex: UI_LAYERS.VINTAGE }}>
            {/* Ben-Day Dots / Halftone Screen - REDUCED OPACITY */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)',
                    backgroundSize: '8px 8px',
                    mixBlendMode: 'multiply' // Changed for better visibility
                }}
            />

            {/* Vignette - REDUCED */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 100%)',
                    mixBlendMode: 'multiply'
                }}
            />
        </div>
    );
};
