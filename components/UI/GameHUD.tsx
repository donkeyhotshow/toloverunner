import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { useVitalityPulse } from '../../hooks/useVitalityPulse';

export const GameHUD: React.FC = () => {
  const score = useStore((s) => s.score);
  const health = useStore((s) => s.lives || 3); // Using lives instead of health
  const multiplier = useStore((s) => s.multiplier || 1);
  const status = useStore((s) => s.status);
  const vitalityPulse = useStore((s) => s.vitalityPulse || 0);
  const setVitalityPulse = useStore((s) => s.setVitalityPulse);

  const pulse = useVitalityPulse();

  useEffect(() => {
    setVitalityPulse(pulse);
  }, [pulse, setVitalityPulse]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col justify-between p-6 font-mono select-none">
      {/* Top Bar - Score & Multiplier */}
      <div className="flex justify-between items-start">
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-yellow-400 border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-2"
        >
          <div className="text-black text-xs font-black uppercase tracking-tighter">Distance Traveled</div>
          <div className="text-4xl font-black italic text-black tabular-nums tracking-[-0.1em]">
            {Math.floor(score).toLocaleString()}
          </div>
        </motion.div>

        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-cyan-400 border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-2"
        >
          <div className="text-black text-xs font-black uppercase tracking-tighter">Multiplier</div>
          <div className="text-3xl font-black italic text-black center">
            x{multiplier.toFixed(1)}
          </div>
        </motion.div>
      </div>

      {/* Bottom Bar - Health Pulser */}
      <div className="flex flex-col items-center gap-4">
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="vitality-container"
        >
          <div className="flex justify-between items-center mb-2 px-3">
            <span className="vitality-label">Vitality</span>
            <span className="vitality-value">{Math.ceil(health)}%</span>
          </div>
          
          <div className="vitality-bar bg-gray-800 border-4 border-black relative overflow-hidden h-12">
            {/* Pulsing Vein Effect - synchronized with tunnel */}
            <motion.div 
              className="vitality-fill h-full"
              style={{ width: `${health}%` }}
              animate={{ 
                opacity: [0.8, 1, 0.8],
                scaleY: [1, 1 + pulse * 0.05, 1] 
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            />
            {/* Animated Highlight Line */}
            <motion.div 
              className="absolute top-0 left-0 h-0.5 bg-white/50 w-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>

      {/* Comic Overlays for Game States */}
      <AnimatePresence>
        {status === 'MENU' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black/40"
          >
            <motion.div 
              initial={{ y: -50, scale: 0.8 }}
              animate={{ y: 0, scale: 1 }}
              className="bg-yellow-400 border-[8px] border-black p-12 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transform -rotate-1 text-center"
            >
              <h1 className="text-8xl font-black italic text-black mb-2 tracking-tighter drop-shadow-[4px_4px_0px_rgba(255,255,255,1)]">
                TOLOVERUNNER
              </h1>
              <div className="text-2xl font-black text-black/60 mb-10 uppercase tracking-widest">
                Bio-Organic Evolution
              </div>
              
              <button 
                onClick={() => useStore.getState().startGame()}
                className="group relative bg-red-600 border-4 border-black px-12 py-5 text-4xl font-black text-white uppercase transition-all hover:scale-110 active:scale-95 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
              >
                <span className="relative z-10">START RUN</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
              
              <div className="mt-8 text-black font-bold uppercase text-sm opacity-50">
                Lanes: [A] [D] | [SPACE] to Jump
              </div>
            </motion.div>
          </motion.div>
        )}

        {status === 'GAME_OVER' && (
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-auto bg-black/50"
          >
            <div className="bg-red-600 border-8 border-black p-10 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] transform -rotate-3 text-center">
              <h1 className="text-7xl font-black italic text-white mb-4 tracking-tighter drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                WASTED!
              </h1>
              <button 
                onClick={() => window.location.reload()}
                className="bg-yellow-400 border-4 border-black px-8 py-3 text-2xl font-black uppercase hover:bg-white transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Try Again?
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};