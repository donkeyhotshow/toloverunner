/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * LocalLeaderboard — in-memory + localStorage leaderboard (ADR-0003 `leaderboard` context).
 *
 * Stores top-N entries locally. Does NOT require a network connection.
 * Used as a standalone component and as the local cache for RemoteLeaderboardAdapter.
 */

import type { ILeaderboard, LeaderboardEntry } from './interfaces';

const STORAGE_KEY = 'tlr_leaderboard_v1';
const DEFAULT_MAX = 100;

export class LocalLeaderboard implements ILeaderboard {
    private _entries: LeaderboardEntry[] = [];
    private readonly _maxEntries: number;

    constructor(maxEntries = DEFAULT_MAX) {
        this._maxEntries = maxEntries;
        this._load();
    }

    addEntry(entry: LeaderboardEntry): void {
        this._entries.push(entry);
        // Keep only top maxEntries by score
        this._entries.sort((a, b) => b.score - a.score);
        if (this._entries.length > this._maxEntries) {
            this._entries.length = this._maxEntries;
        }
        this._persist();
    }

    getTopN(n: number): readonly LeaderboardEntry[] {
        return this._entries.slice(0, n);
    }

    clear(): void {
        this._entries = [];
        this._persist();
    }

    get count(): number {
        return this._entries.length;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private _persist(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
        } catch {
            // Storage quota exceeded — silently ignore
        }
    }

    private _load(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed: unknown = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    this._entries = parsed as LeaderboardEntry[];
                }
            }
        } catch {
            this._entries = [];
        }
    }
}
