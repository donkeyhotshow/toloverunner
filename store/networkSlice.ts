/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { StateCreator } from 'zustand';
import { GameState, NetworkSlice } from './storeTypes';
import { SnapshotSystem } from '../infrastructure/network/SnapshotSystem';
import { GhostSystem } from '../infrastructure/network/GhostSystem';
import { TelemetryExporter } from '../infrastructure/network/TelemetryExporter';
import { NetworkManager } from '../infrastructure/network/NetworkManager';
import { NetworkMessageType, SnapshotPacket, NetworkPacket } from '../types';
import { debugLog } from '../utils/debug';

export const createNetworkSlice: StateCreator<GameState, [], [], NetworkSlice> = (set, get) => {
  const nm = NetworkManager.getInstance();
  const snapshotSystem = new SnapshotSystem();
  const ghostSystem = new GhostSystem();
  void new TelemetryExporter(); // reserved for future telemetry export

  // Subscribe to network messages to update state
  nm.subscribe((packet: NetworkPacket) => {
    switch (packet.type) {
      case NetworkMessageType.SNAPSHOT:
        get().handleSnapshot(packet as SnapshotPacket);
        break;
      // Other message types handled here
    }
  });

  // Subscribe to connection status
  nm.onStatusChange((status: 'idle' | 'connecting' | 'connected' | 'error') => {
    set({ connectionStatus: status });
  });

  return {
    isMultiplayer: false,
    roomCode: null,
    remotePlayerId: null,
    isHost: false,
    isReady: false,
    connectionStatus: 'idle',
    remotePlayerColor: '#FFD700',
    remotePlayerState: {
      lane: 2,
      isJumping: false,
      isDoubleJumping: false,
      isGrounded: true,
      isSliding: false,
      isDead: false,
      rotation: 0,
      position: [0, 0, 0],
      velocity: [0, 0, 0]
    },
    predictionEngine: {
        getPredictedState: () => {
            const interpolated = ghostSystem.getInterpolatedState();
            if (!interpolated) return null;
            return {
                position: interpolated.position as [number, number, number],
                velocity: interpolated.velocity as [number, number, number],
                timestamp: Date.now()
            };
        }
    },

    createRoom: () => {
      debugLog('[Network] Creating room...');
      set({ isMultiplayer: true, isHost: true, connectionStatus: 'connecting' });
      const wsUrl = (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL ?? 'ws://localhost:8080';
      nm.connect(wsUrl);
    },

    joinRoom: (roomCode: string) => {
      debugLog(`[Network] Joining room ${roomCode}...`);
      set({ isMultiplayer: true, isHost: false, roomCode, connectionStatus: 'connecting' });
      const wsUrl = (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL ?? 'ws://localhost:8080';
      nm.connect(wsUrl);
    },

    leaveRoom: () => {
      nm.disconnect();
      set({ isMultiplayer: false, roomCode: null, isHost: false, connectionStatus: 'idle' });
    },

    disconnectMultiplayer: () => {
      nm.disconnect();
      set({ isMultiplayer: false, connectionStatus: 'idle' });
    },

    sendPlayerUpdate: (lane, isJumping, isDoubleJumping, isDead, position, velocity) => {
      const state = get();
      if (!state.isMultiplayer) return;

      const playerDelta = snapshotSystem.createPlayerDelta(nm.getClientId(), {
         lane, isJumping, isDoubleJumping, isDead, position, velocity,
         isGrounded: true, isSliding: false, rotation: 0 // Default values for now
      });

      if (playerDelta) {
          nm.send({
            type: NetworkMessageType.INPUT,
            tick: 0, 
            clientId: nm.getClientId(),
            lane,
            action: isJumping ? 'jump' : 'none',
            timestamp: Date.now()
          });
      }
    },

    toggleReady: () => {
      const newReady = !get().isReady;
      set({ isReady: newReady });
      nm.send({
        type: NetworkMessageType.EVENT,
        tick: 0,
        eventId: 'ready_toggle',
        eventType: 'ui_event',
        payload: { ready: newReady }
      });
    },

    // Internal handler for snapshots
    handleSnapshot: (snapshot: SnapshotPacket) => {
       const remotePlayer = snapshot.players.find(p => p.id !== nm.getClientId());
       if (remotePlayer) {
          ghostSystem.pushSnapshot(remotePlayer);
          
          set({
              remotePlayerId: remotePlayer.id
              // We no longer set remotePlayerState directly here, 
              // as components will use predictionEngine or ghostSystem for smooth interpolation.
          });
       }
    }
  };
};
