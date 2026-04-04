import { create } from 'zustand';

interface CameraShakeStore {
    intensity: number;
    duration: number;
    maxDuration?: number; // 🔥 Track initial duration for linear fade
    shake: (intensity: number, duration: number) => void;
    update: (delta: number) => number; // Returns current shake offset magnitude or vector
}

export const useCameraShake = create<CameraShakeStore>((set, get) => ({
    intensity: 0,
    duration: 0,
    maxDuration: 0, // 🔥 Track initial duration for linear fade
    shake: (intensity, duration) => set({ intensity, duration, maxDuration: duration }),
    update: (delta) => {
        const { intensity, duration, maxDuration } = get();
        if (duration <= 0) return 0;

        const newDuration = Math.max(0, duration - delta);
        set({ duration: newDuration });

        if (newDuration <= 0) {
            set({ intensity: 0 });
            return 0;
        }

        // Exponential Fade (Quadratic Falloff): Impact -> Rapid Decay
        const progress = newDuration / (maxDuration || 1);
        return intensity * Math.pow(progress, 2.5); // 2.5 power for punchy decay
    }
}));

// Helper to trigger shake from anywhere
export const triggerShake = (intensity: number = 0.5, duration: number = 0.3) => {
    useCameraShake.getState().shake(intensity, duration);
};
