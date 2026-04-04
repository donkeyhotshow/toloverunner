/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GameService test stubs (src/multiplayer/GameService.ts)
 * TODO v2.5-1: Replace stub assertions with real session management tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameService } from '../../src/multiplayer/GameService';

describe('GameService', () => {
    let service: GameService;

    beforeEach(() => {
        service = new GameService();
    });

    it('has no session initially', () => {
        expect(service.getSession()).toBeNull();
    });

    it('createSession returns a valid session with waiting status', async () => {
        const session = await service.createSession();
        expect(session.sessionId).toBeTruthy();
        expect(session.status).toBe('waiting');
        expect(session.hostPlayerId).toBeTruthy();
    });

    it('createSession stores session internally', async () => {
        await service.createSession();
        expect(service.getSession()).not.toBeNull();
    });

    it('joinSession returns session with correct id', async () => {
        const session = await service.joinSession('my-session-123');
        expect(session.sessionId).toBe('my-session-123');
        expect(service.getSession()?.sessionId).toBe('my-session-123');
    });

    it('leaveSession clears the stored session', async () => {
        await service.createSession();
        await service.leaveSession();
        expect(service.getSession()).toBeNull();
    });
});
