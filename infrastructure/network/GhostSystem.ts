/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { RemotePlayerState, PlayerState } from '../../types';

interface Snapshot {
  timestamp: number;
  state: RemotePlayerState;
}

export class GhostSystem {
  private snapshots: Snapshot[] = [];
  private interpolationDelay: number = 100; // ms
  private maxBufferSize: number = 20;

  /**
   * Добавляет новый снимок в буфер
   */
  public pushSnapshot(state: RemotePlayerState): void {
    this.snapshots.push({
      timestamp: Date.now(),
      state
    });

    if (this.snapshots.length > this.maxBufferSize) {
      this.snapshots.shift();
    }
  }

  /**
   * Возвращает интерполированное состояние для текущего момента времени
   */
  public getInterpolatedState(): Partial<PlayerState> | null {
    if (this.snapshots.length < 2) {
        const first = this.snapshots[0];
        return first != null ? this.convertState(first.state) : null;
    }

    const renderTime = Date.now() - this.interpolationDelay;

    // Find the two snapshots to interpolate between
    let i = 0;
    while (i < this.snapshots.length - 2) {
      const n = this.snapshots[i + 1];
      if (n == null || n.timestamp >= renderTime) break;
      i++;
    }

    const s1 = this.snapshots[i];
    const s2 = this.snapshots[i + 1];
    if (s1 == null || s2 == null) return null;

    const t = (renderTime - s1.timestamp) / (s2.timestamp - s1.timestamp);
    const clampedT = Math.max(0, Math.min(1, t));

    return {
      position: [
        s1.state.x + (s2.state.x - s1.state.x) * clampedT,
        s1.state.y + (s2.state.y - s1.state.y) * clampedT,
        s1.state.z + (s2.state.z - s1.state.z) * clampedT
      ],
      velocity: [0, 0, s1.state.vel + (s2.state.vel - s1.state.vel) * clampedT],
      lane: Math.round(s1.state.x / 4) // Approximate
    };
  }

  private convertState(s: RemotePlayerState): Partial<PlayerState> {
    return {
      position: [s.x, s.y, s.z],
      velocity: [0, 0, s.vel],
      lane: Math.round(s.x / 4)
    };
  }
}
