
import React from 'react';
import { Resolution, Agent } from '../types';

interface ArbitrationOverlayProps {
  resolution: Resolution | null;
  agents: Agent[];
}

export const ArbitrationOverlay: React.FC<ArbitrationOverlayProps> = ({ resolution, agents }) => {
  if (!resolution) return (
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 animate-in fade-in duration-500">
          <div className="text-4xl animate-bounce mb-4">⚖️</div>
          <h2 className="text-xl font-bold text-cyan-500 animate-pulse tracking-widest">CALCULATING CONSENSUS...</h2>
          <p className="text-gray-500 font-mono text-sm mt-2">WEIGHING ETHICAL VECTORS</p>
      </div>
  );

  const winner = agents.find(a => a.id === resolution.winnerId);

  return (
    <div className="absolute inset-0 bg-[#050505]/95 flex flex-col items-center justify-center z-50 p-6 animate-in zoom-in-95 duration-300 font-mono border-4 border-double border-gray-800">
      <div className="w-full max-w-lg border border-gray-700 bg-black p-8 relative overflow-hidden shadow-2xl">
         {/* Background Scanline */}
         <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-transparent pointer-events-none"></div>
         
         <div className="relative z-10 flex flex-col items-center text-center">
            <div className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-6 border-b border-gray-800 pb-2 w-full">
                Protocol Arbitration v3.0
            </div>

            <div className="mb-6">
                <span className="text-gray-400 text-sm block mb-2">DOMINANT IDEOLOGY DETECTED</span>
                <div className={`text-5xl mb-2 ${winner?.avatarColor || 'text-white'}`}>
                    {winner?.icon || '👑'}
                </div>
                <h1 className={`text-3xl font-black uppercase tracking-tighter ${winner?.avatarColor || 'text-white'}`}>
                    {winner?.name || 'UNKNOWN'}
                </h1>
                <div className="text-xs text-gray-500 mt-1 uppercase">{winner?.role}</div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 p-4 w-full mb-6">
                <div className="text-xs text-gray-400 mb-1 text-left">&gt;&gt; EXECUTING SYSTEM ACTION:</div>
                <div className="text-green-500 font-bold text-lg leading-tight typewriter text-left">
                    &gt; {resolution.action}
                </div>
            </div>

            <p className="text-sm text-gray-400 italic mb-6">
                "{resolution.reasoning}"
            </p>

            <div className="w-full bg-gray-900 h-1 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-cyan-600" style={{ width: `${resolution.consensusScore}%` }}></div>
            </div>
            <div className="flex justify-between w-full text-[10px] text-gray-600 uppercase">
                <span>Total Chaos</span>
                <span>Consensus: {resolution.consensusScore}%</span>
                <span>Unity</span>
            </div>
         </div>
      </div>
    </div>
  );
};
