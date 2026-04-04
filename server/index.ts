/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { SyncService } from './services/syncService';

const app = express();
const port = process.env.PORT || 3000;

/**
 * Health Check Endpoint (/api/health)
 * High priority stabilization requirement
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        version: '2.4.0',
        uptime: process.uptime(),
        services: {
            catalog_sync: 'READY',
            database: 'CONNECTED' // Mock
        }
    });
});

app.get('/api/sync/manual', async (req, res) => {
    try {
        await SyncService.syncAll();
        res.json({ success: true, message: 'Sync triggered' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Sync failed' });
    }
});

app.listen(port, () => {
    console.log(`[Server] Technical API running on port ${port}`);
    SyncService.startScheduledSync();
});
