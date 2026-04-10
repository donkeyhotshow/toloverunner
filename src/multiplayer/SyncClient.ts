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
    INetworkPlayerSnapshot,
    IAuthToken,
    RemoteStateCallback,
    DisconnectCallback,
} from './interfaces';

export class SyncClient implements IGameSync {
    private _connected = false;
    private _remoteSnapshotCallbacks: RemoteStateCallback[] = [];
    private _disconnectCallbacks: DisconnectCallback[] = [];

    get isConnected(): boolean {
        return this._connected;
    }

    async connect(_sessionId: string, _token: IAuthToken): Promise<void> {
        // TODO v2.5-2: Open WebSocket connection to game server
        this._connected = true;
    }

    sendSnapshot(_snapshot: INetworkPlayerSnapshot): void {
        // TODO v2.5-2: Serialize and send snapshot over WebSocket
        if (!this._connected) return;
    }

    onRemoteSnapshot(cb: RemoteStateCallback): () => void {
        this._remoteSnapshotCallbacks.push(cb);
        return () => {
            this._remoteSnapshotCallbacks = this._remoteSnapshotCallbacks.filter(c => c !== cb);
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
        this._remoteSnapshotCallbacks = [];
        this._disconnectCallbacks = [];
    }

    /** Test helper — simulate receiving a remote player snapshot */
    _simulateRemoteSnapshot(snapshot: INetworkPlayerSnapshot): void {
        this._remoteSnapshotCallbacks.forEach(cb => cb(snapshot));
    }
}
