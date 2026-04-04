/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { PlayerController } from './PlayerController';

/**
 * Минимальный wrapper для Player, служит точкой интеграции физики.
 * Использует PlayerController для управления игроком.
 */
export const PlayerPhysicsWrapper: React.FC = () => (
  <PlayerController />
);

PlayerPhysicsWrapper.displayName = 'PlayerPhysicsWrapper';

export default PlayerPhysicsWrapper;
