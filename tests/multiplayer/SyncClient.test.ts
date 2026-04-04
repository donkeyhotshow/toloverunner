/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * SyncClient test stubs (src/multiplayer/SyncClient.ts)
 * Tests verify the pub/sub contract without a real WebSocket.
 * TODO v2.5-2: Add integration tests with a mock WS server.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncClient } from '../../src/multiplayer/SyncClient';
import type { IPlayerState, IAuthToken } from '../../src/multiplayer/interfaces';

const STUB_TOKEN: IAuthToken = { accessToken: 'test', expiresAt: Date.now() + 9999 };

const makeState = (override: Partial<IPlayerState> = {}): IPlayerState => ({
    playerId: 'p1',
    position: [0, 0, 0],
    lane: 0,
    speed: 10,
    lives: 3,
    isGrounded: true,
    characterType: 'default',
    score: 0,
    ...override,
});

describe('SyncClient', () => {
    let client: SyncClient;

    beforeEach(() => {
        client = new SyncClient();
    });

    it('is not connected initially', () => {
        expect(client.isConnected).toBe(false);
    });

    it('connect marks as connected', async () => {
        await client.connect('session-1', STUB_TOKEN);
        expect(client.isConnected).toBe(true);
    });

    it('disconnect marks as not connected', async () => {
        await client.connect('session-1', STUB_TOKEN);
        await client.disconnect();
        expect(client.isConnected).toBe(false);
    });

    it('onRemoteState callback is called when state arrives', async () => {
        await client.connect('session-1', STUB_TOKEN);
        const cb = vi.fn();
        client.onRemoteState(cb);
        client._simulateRemoteState(makeState({ score: 100 }));
        expect(cb).toHaveBeenCalledOnce();
        expect(cb.mock.calls[0][0].score).toBe(100);
    });

    it('onRemoteState unsubscribe prevents further calls', async () => {
        await client.connect('session-1', STUB_TOKEN);
        const cb = vi.fn();
        const unsub = client.onRemoteState(cb);
        unsub();
        client._simulateRemoteState(makeState());
        expect(cb).not.toHaveBeenCalled();
    });

    it('onDisconnect callback is called on explicit disconnect', async () => {
        await client.connect('session-1', STUB_TOKEN);
        const cb = vi.fn();
        client.onDisconnect(cb);
        await client.disconnect();
        expect(cb).toHaveBeenCalledWith('client_requested');
    });

    it('sendState does not throw when connected', async () => {
        await client.connect('session-1', STUB_TOKEN);
        expect(() => client.sendState(makeState())).not.toThrow();
    });
});
