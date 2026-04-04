/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Leaderboard interfaces (ADR-0003 — `leaderboard` bounded context).
 */

export interface LeaderboardEntry {
    /** Player display name */
    playerName: string;
    score: number;
    distance: number;
    /** ISO-8601 timestamp */
    achievedAt: string;
    /** Character skin used */
    characterType: string;
}

export interface ILeaderboard {
    /** Add a new entry (duplicate scores allowed) */
    addEntry(entry: LeaderboardEntry): void;
    /** Return top N entries sorted by score descending */
    getTopN(n: number): readonly LeaderboardEntry[];
    /** Clear all stored entries */
    clear(): void;
    /** Total number of entries stored */
    readonly count: number;
}

export interface IRemoteLeaderboard extends ILeaderboard {
    /** Push new/updated local entries to the server */
    sync(): Promise<SyncResult>;
    /** Fetch the global top-N from the server, replacing local cache */
    fetchGlobal(n: number): Promise<readonly LeaderboardEntry[]>;
}

export interface SyncResult {
    uploaded: number;
    downloaded: number;
    /** ISO-8601 timestamp of sync */
    syncedAt: string;
    error?: string;
}
