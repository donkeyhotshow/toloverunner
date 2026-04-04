/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Shared interfaces for the multiplayer bounded context (ADR-0003).
 * These types are the Anti-Corruption Layer between multiplayer and core/.
 *
 * No implementation here — only contracts consumed by AuthService, GameService, SyncClient.
 */

// ── Player state snapshot sent over the wire ──────────────────────────────────

export interface IPlayerState {
    /** Unique player identifier within a session */
    playerId: string;
    /** World position [x, y, z] */
    position: Readonly<[number, number, number]>;
    /** Active lane index (-2 … +2) */
    lane: number;
    /** Current forward speed (units/s) */
    speed: number;
    /** Remaining lives */
    lives: number;
    /** Is the player on the ground */
    isGrounded: boolean;
    /** Character skin identifier */
    characterType: string;
    /** Score at time of snapshot */
    score: number;
}

// ── Session/Auth ──────────────────────────────────────────────────────────────

export interface IAuthCredentials {
    username: string;
    /** Raw password — never stored; sent only to obtain a token */
    password: string;
}

export interface IAuthToken {
    accessToken: string;
    expiresAt: number; // Unix ms
}

export interface IAuthService {
    signIn(credentials: IAuthCredentials): Promise<IAuthToken>;
    signInAnonymous(): Promise<IAuthToken>;
    signOut(): Promise<void>;
    refreshToken(token: IAuthToken): Promise<IAuthToken>;
    isAuthenticated(): boolean;
}

// ── Session management ────────────────────────────────────────────────────────

export interface IGameSession {
    sessionId: string;
    hostPlayerId: string;
    guestPlayerIds: readonly string[];
    /** ISO-8601 timestamp */
    createdAt: string;
    status: 'waiting' | 'running' | 'finished';
}

export interface IGameService {
    createSession(): Promise<IGameSession>;
    joinSession(sessionId: string): Promise<IGameSession>;
    leaveSession(): Promise<void>;
    getSession(): IGameSession | null;
}

// ── Real-time sync ────────────────────────────────────────────────────────────

export type RemoteStateCallback = (state: IPlayerState) => void;
export type DisconnectCallback = (reason: string) => void;

export interface IGameSync {
    connect(sessionId: string, token: IAuthToken): Promise<void>;
    sendState(state: IPlayerState): void;
    onRemoteState(cb: RemoteStateCallback): () => void;
    onDisconnect(cb: DisconnectCallback): () => void;
    disconnect(): Promise<void>;
    readonly isConnected: boolean;
}
