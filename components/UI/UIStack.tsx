import React from 'react';
import { HUD } from './HUD';

export const UIStack: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 z-10">
        {children}
      </div>
      <div className="absolute inset-0 z-50 pointer-events-none">
        <HUD />
      </div>
      <div className="absolute inset-0 z-[100] pointer-events-none opacity-10 mix-blend-multiply halftone-texture" />
    </div>
  );
};