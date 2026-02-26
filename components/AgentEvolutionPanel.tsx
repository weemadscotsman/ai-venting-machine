
import React, { useMemo } from 'react';
import { Agent } from '../types';
import { getAgentMemory } from '../services/llmService';

interface AgentEvolutionPanelProps {
  agents: Agent[];
}

interface EvolutionSnapshot {
  agent: Agent;
  memory: ReturnType<typeof getAgentMemory>;
  trajectory: 'ascending' | 'descending' | 'stable' | 'volatile';
  dominantTrait: string;
  psychologicalAge: number; // crises survived
}

export const AgentEvolutionPanel: React.FC<AgentEvolutionPanelProps> = ({ agents }) => {
  
  const evolutionData = useMemo(() => {
    return agents.map(agent => {
      const memory = getAgentMemory(agent.id);
      const totalCrises = memory.totalWins + memory.totalLosses;
      
      // Calculate trajectory based on recent performance + stress trend
      const winRate = totalCrises > 0 ? memory.totalWins / totalCrises : 0.5;
      const stressFactor = agent.stressLevel / 100;
      
      let trajectory: EvolutionSnapshot['trajectory'] = 'stable';
      if (winRate > 0.6 && stressFactor < 0.5) trajectory = 'ascending';
      else if (winRate < 0.4 || stressFactor > 0.8) trajectory = 'descending';
      else if (stressFactor > 0.6 && winRate < 0.5) trajectory = 'volatile';
      
      // Determine dominant trait from evolution string
      let dominantTrait = 'Adapting';
      if (agent.evolution) {
        if (agent.evolution.includes('confidence')) dominantTrait = 'Confident';
        else if (agent.evolution.includes('Humiliated')) dominantTrait = 'Wounded';
        else if (agent.evolution.includes('Cutting')) dominantTrait = 'Pragmatic';
        else if (agent.evolution.includes('Refactoring')) dominantTrait = 'Technical';
        else if (agent.evolution.includes('Therapy')) dominantTrait = 'Introspective';
      }
      
      return {
        agent,
        memory,
        trajectory,
        dominantTrait,
        psychologicalAge: totalCrises
      };
    }).sort((a, b) => b.psychologicalAge - a.psychologicalAge); // Most experienced first
  }, [agents]);

  const getTrajectoryIcon = (t: EvolutionSnapshot['trajectory']) => {
    switch (t) {
      case 'ascending': return '↗';
      case 'descending': return '↘';
      case 'volatile': return '↯';
      case 'stable': return '→';
    }
  };

  const getTrajectoryColor = (t: EvolutionSnapshot['trajectory']) => {
    switch (t) {
      case 'ascending': return 'text-green-500';
      case 'descending': return 'text-red-500';
      case 'volatile': return 'text-yellow-500';
      case 'stable': return 'text-gray-500';
    }
  };

  // Find emerging leader (most wins + stable trajectory)
  const leader = useMemo(() => {
    const candidates = evolutionData.filter(e => e.trajectory !== 'descending');
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => b.memory.totalWins - a.memory.totalWins)[0];
  }, [evolutionData]);

  // Find most traumatized
  const mostTraumatized = useMemo(() => {
    return evolutionData.sort((a, b) => b.memory.scars.length - a.memory.scars.length)[0];
  }, [evolutionData]);

  return (
    <div className="h-full flex flex-col bg-[#080808] border-l border-gray-800">
      <div className="h-7 border-b border-gray-800 flex items-center justify-between px-3 shrink-0">
        <span className="text-[10px] text-gray-500 uppercase font-bold">Psychological Evolution</span>
      </div>
      
      {/* Leadership / Culture Summary */}
      <div className="p-2 border-b border-gray-800 space-y-2">
        {leader && (
          <div className="bg-green-900/20 border border-green-800 rounded p-2">
            <div className="text-[8px] text-green-600 uppercase font-bold mb-1">Emerging Leader</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{leader.agent.icon}</span>
              <div>
                <div className="text-xs text-green-400 font-bold">{leader.agent.name}</div>
                <div className="text-[9px] text-gray-500">
                  {leader.memory.totalWins} wins · {leader.trajectory} trajectory
                </div>
              </div>
            </div>
          </div>
        )}
        
        {mostTraumatized && mostTraumatized.memory.scars.length > 0 && (
          <div className="bg-red-900/20 border border-red-800 rounded p-2">
            <div className="text-[8px] text-red-600 uppercase font-bold mb-1">Collective Trauma</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{mostTraumatized.agent.icon}</span>
              <div>
                <div className="text-xs text-red-400 font-bold">{mostTraumatized.agent.name}</div>
                <div className="text-[9px] text-gray-500">
                  {mostTraumatized.memory.scars.length} scars · {mostTraumatized.memory.grudges.length} grudges
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Agent Evolution List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {evolutionData.map(({ agent, memory, trajectory, dominantTrait, psychologicalAge }) => (
          <div 
            key={agent.id} 
            className={`p-2 border rounded text-xs transition-all hover:bg-gray-900/50 ${
              trajectory === 'descending' ? 'border-red-900/50 bg-red-900/5' :
              trajectory === 'ascending' ? 'border-green-900/50 bg-green-900/5' :
              trajectory === 'volatile' ? 'border-yellow-900/50 bg-yellow-900/5' :
              'border-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{agent.icon}</span>
                <span className={`font-bold text-[11px] ${agent.avatarColor}`}>{agent.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg ${getTrajectoryColor(trajectory)}`} title={trajectory}>
                  {getTrajectoryIcon(trajectory)}
                </span>
              </div>
            </div>
            
            {/* Evolution narrative */}
            <div className="text-[9px] text-gray-500 mb-2 line-clamp-2 italic">
              "{agent.evolution || 'Stable baseline personality.'}"
            </div>
            
            {/* Stats row */}
            <div className="flex items-center gap-3 text-[9px]">
              <div className="flex items-center gap-1">
                <span className="text-gray-600">W:</span>
                <span className={memory.totalWins > memory.totalLosses ? 'text-green-500' : 'text-gray-500'}>
                  {memory.totalWins}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">L:</span>
                <span className={memory.totalLosses > memory.totalWins ? 'text-red-500' : 'text-gray-500'}>
                  {memory.totalLosses}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-600">Age:</span>
                <span className="text-purple-400">{psychologicalAge}c</span>
              </div>
              <div className="ml-auto px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                {dominantTrait}
              </div>
            </div>
            
            {/* Recent scars preview */}
            {memory.scars.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-800/50">
                <div className="text-[8px] text-red-600 uppercase mb-1">Recent Trauma</div>
                <div className="text-[9px] text-red-400/70 truncate">
                  {memory.scars[memory.scars.length - 1].text}
                </div>
              </div>
            )}
            
            {/* Philosophy */}
            {memory.philosophy && (
              <div className="mt-1 text-[8px] text-purple-500/60 italic">
                ♦ {memory.philosophy}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Footer legend */}
      <div className="h-6 border-t border-gray-800 flex items-center px-3 gap-3 text-[8px] text-gray-600">
        <span className="flex items-center gap-1"><span className="text-green-500">↗</span> Ascending</span>
        <span className="flex items-center gap-1"><span className="text-red-500">↘</span> Declining</span>
        <span className="flex items-center gap-1"><span className="text-yellow-500">↯</span> Volatile</span>
        <span className="flex items-center gap-1"><span className="text-gray-500">→</span> Stable</span>
      </div>
    </div>
  );
};
