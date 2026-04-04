/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo } from 'react';
import { Group } from 'three';
import { useStore } from '../../store';
import { registerGameLoopCallback, unregisterGameLoopCallback } from '../System/GameLoopRegistry';
import { ToonSperm } from '../player/ToonSperm';
import { GhostSystem } from '../../infrastructure/network/GhostSystem';

export const RemotePlayer: React.FC = React.memo(() => {
    const mesh = useRef<Group>(null);
    const ghostSystem = useMemo(() => new GhostSystem(), []);
    const remotePlayerId = useStore(state => state.remotePlayerId);
    const isMultiplayer = useStore(state => state.isMultiplayer);

    React.useEffect(() => {
        if (!isMultiplayer) return;

        // TODO: Network slice should feed GhostSystem; placeholder subscription for future wiring
        const unsub = useStore.subscribe(() => {
            // Intentionally empty for now; networkSlice will drive ghostSystem externally.
        });

        const callback = (_delta: number, _time: number) => {
            const interpolated = ghostSystem.getInterpolatedState();
            if (interpolated && mesh.current && interpolated.position) {
                const [x, y, z] = interpolated.position;
                mesh.current.position.set(x, y, z);
            }
        };

        registerGameLoopCallback('renderUpdate', callback);
        return () => {
            unsub();
            unregisterGameLoopCallback('renderUpdate', callback);
        };
    }, [isMultiplayer, ghostSystem]);

    if (!isMultiplayer || !remotePlayerId) return null;

    return (
        <group ref={mesh}>
            <ToonSperm 
                speed={1.0}
                scale={0.9}   // Slightly smaller
            />
            {/* Minimal point light for remote player */}
            <pointLight color="#FF4500" intensity={1} distance={5} />
        </group>
    );
});

RemotePlayer.displayName = 'RemotePlayer';
