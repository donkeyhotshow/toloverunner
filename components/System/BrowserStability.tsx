/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BrowserStabilityController - Component wrapper for stability hook
 */

import React from 'react';
import { useBrowserStability } from '../../hooks/useBrowserStability';

// React Component wrapper
export const BrowserStabilityController: React.FC = () => {
    useBrowserStability();
    return null;
};
