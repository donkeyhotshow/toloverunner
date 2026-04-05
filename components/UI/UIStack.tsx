import React from 'react';
import { GameHUD } from './GameHUD';

export const UIStack: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 3D Content (Canvas) */}
      <div className="absolute inset-0 z-10">
        {children}
      </div>

      {/* 2D HUD Layer */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        <GameHUD />
      </div>

      {/* Halftone Overlay (Ben-Day dots) for the whole screen */}
      <div className="absolute inset-0 z-[100] pointer-events-none opacity-10 mix-blend-multiply halftone-texture" />
    </div>
  );
};
