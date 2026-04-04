/**
 * CollisionWorker - DISABLED
 * Не используется в упрощенной версии
 */

self.addEventListener('message', (ev: MessageEvent) => {
    (self as unknown as { postMessage: (data: unknown) => void }).postMessage({ id: ev.data?.id ?? 0, result: { hit: false, object: null } });
});
