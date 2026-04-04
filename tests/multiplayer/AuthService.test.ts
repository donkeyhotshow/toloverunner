/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * AuthService test stubs (src/multiplayer/AuthService.ts)
 * No real server — all stubs. TODO v2.5-1: add integration tests with mock server.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/multiplayer/AuthService';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        service = new AuthService();
    });

    it('is not authenticated initially', () => {
        expect(service.isAuthenticated()).toBe(false);
    });

    it('signIn returns an access token and marks authenticated', async () => {
        const token = await service.signIn({ username: 'player1', password: 'secret' });
        expect(token.accessToken).toBeTruthy();
        expect(token.expiresAt).toBeGreaterThan(Date.now());
        expect(service.isAuthenticated()).toBe(true);
    });

    it('signInAnonymous returns a unique token per call', async () => {
        const a = await service.signInAnonymous();
        const b = await service.signInAnonymous();
        expect(a.accessToken).not.toBe(b.accessToken);
    });

    it('signOut marks not authenticated', async () => {
        await service.signIn({ username: 'player1', password: 'secret' });
        await service.signOut();
        expect(service.isAuthenticated()).toBe(false);
    });

    it('refreshToken returns a new token', async () => {
        const original = await service.signIn({ username: 'player1', password: 'secret' });
        const refreshed = await service.refreshToken(original);
        expect(refreshed.accessToken).toBeTruthy();
        // TODO v2.5-1: assert refreshed.accessToken !== original.accessToken when real backend is wired
    });
});
