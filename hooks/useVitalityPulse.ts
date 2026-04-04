import { useState } from 'react';
import { useFrame } from '@react-three/fiber';

const easeInOut = (t: number) => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export const useVitalityPulse = () => {
  const [pulse, setPulse] = useState(0);
  useFrame(({ clock }) => {
    const pulsePeriod = 1.5;
    const progress = (clock.elapsedTime % pulsePeriod) / pulsePeriod;
    let eased: number;
    if (progress < 0.5) {
      eased = easeInOut(progress * 2);
    } else {
      eased = easeInOut((1 - progress) * 2);
    }
    setPulse(eased);
  });
  return pulse;
};