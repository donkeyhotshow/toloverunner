import { useMemo, useEffect } from 'react';
import { TrackSystem } from '../../../core/track/TrackSystem';

export const useTrackSystem = () => {
    const trackSystem = useMemo(() => new TrackSystem(), []);

    useEffect(() => {
        return () => {
            trackSystem.dispose();
        };
    }, [trackSystem]);

    return trackSystem;
};
