/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PauseSystemController - Component wrapper for pause hook
 */

import React from 'react';
import { usePauseSystem } from '../../hooks/usePauseSystem';

// React Component wrapper
export const PauseSystemController: React.FC = () => {
    usePauseSystem();
    return null;
};
