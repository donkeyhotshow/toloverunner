import { beforeEach, describe, expect, it } from 'vitest';
import { useCameraShake } from '../store/cameraShakeStore';

describe('camera shake collision feedback', () => {
  beforeEach(() => {
    useCameraShake.setState({ intensity: 0, duration: 0, maxDuration: 0 });
  });

  it('clamps a collision impulse to safe bounds', () => {
    useCameraShake.getState().shake(1.2, 0.6);
    const state = useCameraShake.getState();

    expect(state.intensity).toBe(0.22);
    expect(state.duration).toBe(0.18);
    expect(state.maxDuration).toBe(0.18);
  });

  it('does not shorten an active impact when feedback retriggers', () => {
    useCameraShake.getState().shake(0.16, 0.12);
    useCameraShake.getState().shake(0.08, 0.04);
    const state = useCameraShake.getState();

    expect(state.intensity).toBe(0.16);
    expect(state.duration).toBe(0.12);
  });

  it('decays to zero without leaving camera feedback active', () => {
    useCameraShake.getState().shake(0.22, 0.18);

    expect(useCameraShake.getState().update(0.09)).toBeGreaterThan(0);
    expect(useCameraShake.getState().update(0.09)).toBe(0);
    expect(useCameraShake.getState().intensity).toBe(0);
    expect(useCameraShake.getState().duration).toBe(0);
  });
});
