/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * RemoteLeaderboardAdapter test stubs (src/leaderboard/RemoteLeaderboardAdapter.ts)
 * TODO v2.5-2: Replace stub assertions with real HTTP mock tests (msw or vitest mocks).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RemoteLeaderboardAdapter } from '../../src/leaderboard/RemoteLeaderboardAdapter';
import type { LeaderboardEntry } from '../../src/leaderboard/interfaces';

const makeEntry = (score: number): LeaderboardEntry => ({
    playerName: 'Tester',
    score,
    distance: score * 5,
    achievedAt: new Date().toISOString(),
    characterType: 'default',
});

describe('RemoteLeaderboardAdapter', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('starts empty', () => {
        const adapter = new RemoteLeaderboardAdapter('https://api.example.com');
        expect(adapter.count).toBe(0);
    });

    it('addEntry delegates to local store', () => {
        const adapter = new RemoteLeaderboardAdapter('https://api.example.com');
        adapter.addEntry(makeEntry(500));
        expect(adapter.count).toBe(1);
    });

    it('getTopN returns sorted entries', () => {
        const adapter = new RemoteLeaderboardAdapter('https://api.example.com');
        adapter.addEntry(makeEntry(300));
        adapter.addEntry(makeEntry(100));
        adapter.addEntry(makeEntry(200));
        const top = adapter.getTopN(2);
        expect(top[0]!.score).toBe(300);
        expect(top[1]!.score).toBe(200);
    });

    it('sync returns a SyncResult with non-negative counts', async () => {
        const adapter = new RemoteLeaderboardAdapter('https://api.example.com');
        adapter.addEntry(makeEntry(100));
        const result = await adapter.sync();
        expect(result.uploaded).toBeGreaterThanOrEqual(0);
        expect(result.downloaded).toBeGreaterThanOrEqual(0);
        expect(result.syncedAt).toBeTruthy();
    });

    it('fetchGlobal returns an array (stub returns local data)', async () => {
        const adapter = new RemoteLeaderboardAdapter('https://api.example.com');
        adapter.addEntry(makeEntry(999));
        const global = await adapter.fetchGlobal(10);
        expect(Array.isArray(global)).toBe(true);
    });

    it('clear removes all entries', () => {
        const adapter = new RemoteLeaderboardAdapter('https://api.example.com');
        adapter.addEntry(makeEntry(100));
        adapter.clear();
        expect(adapter.count).toBe(0);
    });
});
