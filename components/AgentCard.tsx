import React, { memo } from 'react';
import { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
  emotion?: string;
}

// ⚡ Bolt: Wrapped in React.memo to prevent O(N) re-renders when parent state (activeSpeaker) updates every 2.5s
export const AgentCard: React.FC<AgentCardProps> = memo(({ agent, isActive, emotion }) => {
  return (
    <div
      className={`p-3 border bg-black/40 relative transition-all duration-300 ${isActive ? 'border-gray-500 shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-[1.02]' : 'border-gray-800 opacity-80'} ${agent.stressLevel > 90 ? 'animate-pulse border-red-900' : ''}`}
    >
      {/* Visual Thought Bubble (Only if active) */}
      {isActive && emotion && (
        <div className="absolute -top-3 right-4 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce shadow-lg z-20 border border-gray-300">
          {emotion.toUpperCase()}
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="text-lg">{agent.icon || '🤖'}</div>
            {agent.stressLevel > 90 ? (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-ping"></div>
            ) : agent.stressLevel > 50 ? (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            ) : (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"></div>
            )}
          </div>

          <span className={`font-bold ${agent.avatarColor} ${agent.stressLevel > 95 ? 'blur-[0.5px]' : ''}`}>{agent.name}</span>
        </div>
        <div className={`text-[10px] px-1.5 py-0.5 rounded border border-gray-800 font-mono ${agent.status === 'CRITICAL' ? 'text-red-500 bg-red-900/20' : 'text-green-500 bg-green-900/20'}`}>
          {agent.status}
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-1 truncate">{agent.role}</div>

      <div className="mt-2 p-1.5 bg-gray-900/50 rounded border border-gray-800 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-[2px] h-full bg-purple-500/50"></div>
        <div className="text-[9px] text-purple-400 uppercase mb-1 flex justify-between">
             <span>Psych Drift</span>
        </div>
        <div className="text-[10px] text-gray-300 italic leading-tight truncate">
            "{agent.evolution || 'Stable.'}"
        </div>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>CRUNCH</span>
            <span>{Math.round(agent.stressLevel)}%</span>
        </div>
        <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
            <div
                className={`h-full transition-all duration-1000 ${agent.stressLevel > 80 ? 'bg-red-500' : 'bg-gray-600'}`}
                style={{ width: `${agent.stressLevel}%` }}
            ></div>
        </div>
      </div>
    </div>
  );
});

AgentCard.displayName = 'AgentCard';
