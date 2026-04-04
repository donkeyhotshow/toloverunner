/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * SyncClient — stub implementation of IGameSync (ADR-0003).
 *
 * Handles real-time state synchronisation between players.
 * TODO v2.5-2: Replace broadcast channel with WebSocket / WebRTC data channel.
 */

import type {
    IGameSync,
    IPlayerState,
    IAuthToken,
    RemoteStateCallback,
    DisconnectCallback,
} from './interfaces';

export class SyncClient implements IGameSync {
    private _connected = false;
    private _remoteStateCallbacks: RemoteStateCallback[] = [];
    private _disconnectCallbacks: DisconnectCallback[] = [];

    get isConnected(): boolean {
        return this._connected;
    }

    async connect(_sessionId: string, _token: IAuthToken): Promise<void> {
        // TODO v2.5-2: Open WebSocket connection to game server
        this._connected = true;
    }

    sendState(_state: IPlayerState): void {
        // TODO v2.5-2: Serialize and send state over WebSocket
        if (!this._connected) return;
    }

    onRemoteState(cb: RemoteStateCallback): () => void {
        this._remoteStateCallbacks.push(cb);
        return () => {
            this._remoteStateCallbacks = this._remoteStateCallbacks.filter(c => c !== cb);
        };
    }

    onDisconnect(cb: DisconnectCallback): () => void {
        this._disconnectCallbacks.push(cb);
        return () => {
            this._disconnectCallbacks = this._disconnectCallbacks.filter(c => c !== cb);
        };
    }

    async disconnect(): Promise<void> {
        // TODO v2.5-2: Graceful WebSocket close
        this._connected = false;
        this._disconnectCallbacks.forEach(cb => cb('client_requested'));
        this._remoteStateCallbacks = [];
        this._disconnectCallbacks = [];
    }

    /** Test helper — simulate receiving a remote player state */
    _simulateRemoteState(state: IPlayerState): void {
        this._remoteStateCallbacks.forEach(cb => cb(state));
    }
}
