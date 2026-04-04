/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { TDITelemetryPacket, NetworkMessageType } from '../../types';

export class TelemetryExporter {
  private lastSentTime: number = 0;
  private exportInterval: number = 500; // ms (2 Hz)

  /**
   * Проверяет, пришло ли время для отправки следующей порции телеметрии
   */
  public shouldExport(): boolean {
    const now = Date.now();
    if (now - this.lastSentTime >= this.exportInterval) {
      this.lastSentTime = now;
      return true;
    }
    return false;
  }

  /**
   * Подготавливает пакет телеметрии
   */
  public createTelemetryPacket(
    clientId: string,
    tick: number,
    tdi: number,
    visibleObstacles: number,
    fps: number
  ): TDITelemetryPacket {
    return {
      type: NetworkMessageType.TDI_TELEMETRY,
      clientId,
      tick,
      tdi: Math.round(tdi * 100) / 100, // Precision 0.01
      visibleObstacles,
      localFps: Math.round(fps),
      timestamp: Date.now()
    };
  }
}
