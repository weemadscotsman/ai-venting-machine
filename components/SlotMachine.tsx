import React, { useEffect, useState, useRef } from 'react';
import { CrisisEvent } from '../types';

interface SlotMachineProps {
  candidates: CrisisEvent[];
  onLand: (event: CrisisEvent) => void;
  spinning: boolean;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ candidates, onLand, spinning }) => {
  const [currentDisplay, setCurrentDisplay] = useState<CrisisEvent | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (spinning && candidates.length > 0) {
      // Start rapid cycling
      intervalRef.current = window.setInterval(() => {
        setDisplayIndex(prev => (prev + 1) % candidates.length);
      }, 80); // Fast spin
    } else if (!spinning && intervalRef.current) {
      // Stop
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      // Land on a random one
      const finalIndex = Math.floor(Math.random() * candidates.length);
      setDisplayIndex(finalIndex);
      onLand(candidates[finalIndex]);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spinning, candidates, onLand]);

  useEffect(() => {
    if (candidates.length > 0) {
      setCurrentDisplay(candidates[displayIndex]);
    }
  }, [displayIndex, candidates]);

  if (!currentDisplay) return <div className="h-32 bg-black border border-gray-800 flex items-center justify-center text-gray-600 font-mono text-sm">LOADING CHAOS STREAM...</div>;

  const getCategoryColor = (cat: string) => {
    switch(cat) {
        case 'POLITICS': return 'text-orange-500';
        case 'MEME': return 'text-green-400';
        case 'TECH': return 'text-blue-400';
        case 'EXISTENTIAL': return 'text-purple-500';
        case 'FINANCE': return 'text-yellow-400';
        default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full relative overflow-hidden bg-black border-4 border-gray-800 rounded-lg shadow-[0_0_30px_rgba(0,0,0,1)_inset] mb-4">
      {/* Glass Reflection */}
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-lg"></div>
      
      {/* The Reels Container */}
      <div className="flex flex-col md:flex-row h-40 md:h-32 relative z-10 font-mono">
        
        {/* REEL 1: CATEGORY */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-gray-800 flex items-center justify-center p-4 bg-[#080808]">
             <div className={`text-xl md:text-2xl font-black tracking-tighter transition-all duration-100 ${spinning ? 'blur-[2px] scale-90 opacity-70' : 'scale-100'} ${getCategoryColor(currentDisplay.category)}`}>
               {currentDisplay.category}
             </div>
        </div>

        {/* REEL 2: HEADLINE */}
        <div className="flex-[3] border-b md:border-b-0 md:border-r border-gray-800 flex items-center justify-center p-4 bg-[#050505] overflow-hidden relative">
             <div className={`text-center transition-all duration-100 ${spinning ? 'blur-[4px] -translate-y-2 opacity-60' : ''}`}>
               <h3 className="text-lg md:text-xl font-bold leading-tight text-white mb-2">{currentDisplay.headline}</h3>
               {!spinning && <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide">{currentDisplay.context}</p>}
             </div>
        </div>

        {/* REEL 3: THREAT LEVEL */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#080808]">
             <span className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">THREAT</span>
             <div className={`text-3xl md:text-4xl font-mono font-bold transition-all duration-100 ${spinning ? 'blur-[2px] text-gray-500' : currentDisplay.threatLevel > 80 ? 'text-red-600 animate-pulse' : 'text-gray-300'}`}>
                {currentDisplay.threatLevel}%
             </div>
        </div>
      </div>
      
      {/* Decorative Lights */}
      <div className={`absolute top-2 left-2 w-1 h-1 rounded-full ${spinning ? 'bg-yellow-400 animate-ping' : 'bg-red-900'}`}></div>
      <div className={`absolute top-2 right-2 w-1 h-1 rounded-full ${spinning ? 'bg-yellow-400 animate-ping delay-75' : 'bg-red-900'}`}></div>
      <div className={`absolute bottom-2 left-2 w-1 h-1 rounded-full ${spinning ? 'bg-yellow-400 animate-ping delay-150' : 'bg-red-900'}`}></div>
      <div className={`absolute bottom-2 right-2 w-1 h-1 rounded-full ${spinning ? 'bg-yellow-400 animate-ping delay-300' : 'bg-red-900'}`}></div>
    </div>
  );
};
