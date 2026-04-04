/**
 * CollisionWorkerClient - manages a module worker that performs heavy collision checks.
 * Uses Vite-compatible worker import.
 */

/** Результат коллизии от воркера (hit, object и т.д.) */
export interface CollisionResult {
    hit: boolean;
    object: unknown;
}

type Req = {
    id: number;
    resolve: (r: CollisionResult | null) => void;
    timeoutId?: ReturnType<typeof setTimeout>;
};

export class CollisionWorkerClient {
    private worker: Worker | null = null;
    private pending = new Map<number, Req>();
    private idSeq = 1;

    constructor() {
        // Worker disabled due to rehydration issues in this environment
        this.worker = null;
    }

    isAvailable() {
        return this.worker !== null;
    }

    request(player: { x: number; y: number; z: number }, objects: unknown[], currentDistance = 0, previousDistance = 0, timeoutMs = 500): Promise<CollisionResult | null> {
        const worker = this.worker;
        if (!worker) return Promise.resolve(null);
        const id = this.idSeq++;
        return new Promise<CollisionResult | null>((resolve) => {
            const timeoutId = setTimeout(() => {
                const req = this.pending.get(id);
                if (req) {
                    this.pending.delete(id);
                    if (req.timeoutId !== undefined) clearTimeout(req.timeoutId);
                    resolve(null);
                }
            }, timeoutMs);
            const req: Req = { id, resolve: (r) => {
                if (req.timeoutId !== undefined) clearTimeout(req.timeoutId); // WEAK_SPOTS 4.2: отмена таймаута при успешном ответе воркера
                this.pending.delete(id);
                resolve(r);
            }, timeoutId };
            req.timeoutId = timeoutId;
            this.pending.set(id, req);
            worker.postMessage({ id, player, objects, currentDistance, previousDistance });
        });
    }
}

export const collisionWorkerClient = new CollisionWorkerClient();
