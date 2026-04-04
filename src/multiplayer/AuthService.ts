/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * AuthService — stub implementation of IAuthService (ADR-0003).
 *
 * TODO v2.5-1: Replace stub with real JWT/OAuth flow.
 * The stub returns mock tokens so that tests and local dev work without a backend.
 */

import type { IAuthService, IAuthCredentials, IAuthToken } from './interfaces';

export class AuthService implements IAuthService {
    private _authenticated = false;

    async signIn(_credentials: IAuthCredentials): Promise<IAuthToken> {
        // TODO: POST /api/auth/login
        this._authenticated = true;
        return {
            accessToken: 'stub-access-token',
            expiresAt: Date.now() + 3_600_000,
        };
    }

    async signInAnonymous(): Promise<IAuthToken> {
        // TODO: POST /api/auth/anonymous
        this._authenticated = true;
        return {
            accessToken: `anon-${Math.random().toString(36).slice(2)}`,
            expiresAt: Date.now() + 3_600_000,
        };
    }

    async signOut(): Promise<void> {
        // TODO: POST /api/auth/logout
        this._authenticated = false;
    }

    async refreshToken(_token: IAuthToken): Promise<IAuthToken> {
        // TODO: POST /api/auth/refresh
        return {
            accessToken: 'stub-refreshed-token',
            expiresAt: Date.now() + 3_600_000,
        };
    }

    isAuthenticated(): boolean {
        return this._authenticated;
    }
}
