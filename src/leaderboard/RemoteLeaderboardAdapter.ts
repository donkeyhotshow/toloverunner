/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * RemoteLeaderboardAdapter — stub that wraps LocalLeaderboard and adds server sync
 * (ADR-0003 `leaderboard` bounded context).
 *
 * TODO v2.5-2: Replace fetch stubs with real API calls to the game backend.
 */

import type { IRemoteLeaderboard, LeaderboardEntry, SyncResult } from './interfaces';
import { LocalLeaderboard } from './LocalLeaderboard';

export class RemoteLeaderboardAdapter implements IRemoteLeaderboard {
    private readonly _local: LocalLeaderboard;
    private readonly _apiBase: string;

    constructor(apiBase: string, maxEntries?: number) {
        this._apiBase = apiBase;
        this._local = new LocalLeaderboard(maxEntries);
    }

    addEntry(entry: LeaderboardEntry): void {
        this._local.addEntry(entry);
    }

    getTopN(n: number): readonly LeaderboardEntry[] {
        return this._local.getTopN(n);
    }

    clear(): void {
        this._local.clear();
    }

    get count(): number {
        return this._local.count;
    }

    async sync(): Promise<SyncResult> {
        // TODO v2.5-2: POST this._apiBase + '/entries' with local entries
        // For now return a stub successful result
        return {
            uploaded: this._local.count,
            downloaded: 0,
            syncedAt: new Date().toISOString(),
        };
    }

    async fetchGlobal(n: number): Promise<readonly LeaderboardEntry[]> {
        // TODO v2.5-2: GET this._apiBase + '/top?n=' + n
        // Stub: return local data
        void this._apiBase;
        return this._local.getTopN(n);
    }
}
