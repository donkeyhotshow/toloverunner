/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

interface ClientTelemetry {
    tdi: number;
    fps: number;
    timestamp: number;
}

export class TDIAggregator {
    private static clients: Map<string, ClientTelemetry> = new Map();
    private static STALE_TIMEOUT = 5000; // ms

    /**
     * Обновляет метрики отдельного клиента
     */
    public static updateClient(clientId: string, tdi: number, fps: number): void {
        this.clients.set(clientId, {
            tdi,
            fps,
            timestamp: Date.now()
        });
    }

    /**
     * Рассчитывает глобальный TDI и рекомендацию по спавну
     * Возвращает множитель плотности (0.5..1.0)
     */
    public static getGlobalSpawnModifier(): number {
        this.cleanupStaleClients();
        
        if (this.clients.size === 0) return 1.0;

        let totalTdi = 0;
        let count = 0;

        this.clients.forEach(c => {
            // Give more weight to clients struggling with FPS
            const weight = c.fps < 45 ? 1.5 : 1.0;
            totalTdi += c.tdi * weight;
            count += weight;
        });

        const avgTdi = totalTdi / count;

        // HIS-TERESIS LOGIC
        // If TDI is very high (> 0.8), reduce spawn density significantly
        if (avgTdi > 0.85) return 0.6;
        if (avgTdi > 0.7) return 0.8;
        if (avgTdi > 0.5) return 0.9;
        
        return 1.0;
    }

    private static cleanupStaleClients(): void {
        const now = Date.now();
        this.clients.forEach((c, id) => {
            if (now - c.timestamp > this.STALE_TIMEOUT) {
                this.clients.delete(id);
            }
        });
    }
}
