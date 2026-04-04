/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GameService — stub implementation of IGameService (ADR-0003).
 *
 * TODO v2.5-1: Replace with real REST/WebSocket session management.
 */

import type { IGameService, IGameSession } from './interfaces';

export class GameService implements IGameService {
    private _session: IGameSession | null = null;

    async createSession(): Promise<IGameSession> {
        // TODO: POST /api/sessions
        const session: IGameSession = {
            sessionId: `session-${Date.now()}`,
            hostPlayerId: 'local-player',
            guestPlayerIds: [],
            createdAt: new Date().toISOString(),
            status: 'waiting',
        };
        this._session = session;
        return session;
    }

    async joinSession(sessionId: string): Promise<IGameSession> {
        // TODO: POST /api/sessions/:sessionId/join
        const session: IGameSession = {
            sessionId,
            hostPlayerId: 'remote-host',
            guestPlayerIds: ['local-player'],
            createdAt: new Date().toISOString(),
            status: 'waiting',
        };
        this._session = session;
        return session;
    }

    async leaveSession(): Promise<void> {
        // TODO: POST /api/sessions/:sessionId/leave
        this._session = null;
    }

    getSession(): IGameSession | null {
        return this._session;
    }
}
