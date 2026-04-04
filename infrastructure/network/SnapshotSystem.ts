/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { PlayerState, GameObject, RemotePlayerState, RemoteObstacleState, SnapshotPacket, NetworkMessageType } from '../../types';

export class SnapshotSystem {
  private lastSentPlayerState: RemotePlayerState | null = null;
  private precision: number = 100; // Quantization precision (0.01)

  /**
   * Сжимает состояние игрока для отправки
   */
  public createPlayerDelta(localId: string, state: PlayerState): RemotePlayerState | null {
    const current: RemotePlayerState = {
      id: localId,
      x: Math.round(state.position[0] * this.precision) / this.precision,
      y: Math.round(state.position[1] * this.precision) / this.precision,
      z: Math.round(state.position[2] * this.precision) / this.precision,
      vel: Math.round(state.velocity[2] * 10) / 10 // Velocity needs less precision
    };

    // Simple Delta Check (Skip if change is negligible)
    if (this.lastSentPlayerState) {
        const dx = Math.abs(current.x - this.lastSentPlayerState.x);
        const dz = Math.abs(current.z - this.lastSentPlayerState.z);
        if (dx < 0.01 && dz < 0.05) return null; 
    }

    this.lastSentPlayerState = current;
    return current;
  }

  /**
   * Сериализует активные препятствия
   */
  public serializeObstacles(obstacles: GameObject[]): RemoteObstacleState[] {
    return obstacles
      .filter(o => o.active)
      .map(o => ({
        id: o.id,
        lane: Math.round(o.position[0] / 4), // Assuming lanes are ~4 units apart
        type: o.type,
        state: 'moving'
      }));
  }

  /**
   * Собирает полный пакет снимка
   */
  public packSnapshot(
      tick: number, 
      localPlayer: RemotePlayerState, 
      obstacles: RemoteObstacleState[], 
      tdi: number
  ): SnapshotPacket {
    return {
      type: NetworkMessageType.SNAPSHOT,
      tick,
      players: [localPlayer],
      obstacles,
      globalTdi: tdi
    };
  }
}
