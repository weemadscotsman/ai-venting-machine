
import React from 'react';
import { VentLog, Agent } from '../types';
import { getAgentMemory, getRelationship } from '../services/llmService';

interface CulturalMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: VentLog[];
  agents: Agent[];
}

interface EpochSummary {
  id: string;
  timestamp: string;
  crisisCount: number;
  dominantIdeology: string;
  powerShifts: PowerShift[];
  culturalScars: CulturalScar[];
  alliancesFormed: Alliance[];
  leadership: string | null;
}

interface PowerShift {
  agentId: string;
  change: 'rise' | 'fall' | 'stable';
  reason: string;
}

interface CulturalScar {
  agentId: string;
  trauma: string;
  impact: string;
}

interface Alliance {
  agentA: string;
  agentB: string;
  type: 'friendship' | 'coalition' | 'rivalry';
  strength: number;
}

export const CulturalMemoryModal: React.FC<CulturalMemoryModalProps> = ({ 
  isOpen, 
  onClose, 
  logs, 
  agents 
}) => {
  
  if (!isOpen) return null;

  // Generate epoch summaries from logs
  const epochs = React.useMemo(() => {
    const archiveLogs = logs.filter(l => l.conflictType === 'EPOCH_ARCHIVE');
    
    return archiveLogs.map((archive, idx) => {
      // Find all logs between this archive and the previous one (or start)
      const prevTime = idx > 0 ? new Date(archiveLogs[idx - 1].timestamp).getTime() : 0;
      const thisTime = new Date(archive.timestamp).getTime();
      
      const epochLogs = logs.filter(l => {
        const t = new Date(l.timestamp).getTime();
        return t > prevTime && t <= thisTime;
      });
      
      const crises = epochLogs.filter(l => l.conflictType === 'GROUP_CRISIS');
      const arbitrations = epochLogs.filter(l => l.conflictType === 'ARBITRATION_RULING');
      
      // Calculate power shifts
      const powerShifts: PowerShift[] = [];
      agents.forEach(agent => {
        const mem = getAgentMemory(agent.id);
        const winsInEpoch = epochLogs.filter(l => 
          l.conflictType === 'ARBITRATION_RULING' && l.rawOutput.includes(agent.id)
        ).length;
        
        if (winsInEpoch >= 2) {
          powerShifts.push({ agentId: agent.id, change: 'rise', reason: `${winsInEpoch} arbitration wins` });
        } else if (mem.totalLosses > mem.totalWins && epochLogs.some(l => l.agentId === agent.id)) {
          powerShifts.push({ agentId: agent.id, change: 'fall', reason: 'Consistent losses' });
        }
      });
      
      // Extract cultural scars
      const culturalScars: CulturalScar[] = [];
      agents.forEach(agent => {
        const mem = getAgentMemory(agent.id);
        mem.scars.slice(-1).forEach(scar => {
          culturalScars.push({
            agentId: agent.id,
            trauma: scar.text,
            impact: scar.severity > 7 ? 'Critical' : scar.severity > 4 ? 'Significant' : 'Minor'
          });
        });
      });
      
      // Detect alliances
      const alliancesFormed: Alliance[] = [];
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const rel = getRelationship(agents[i].id, agents[j].id);
          if (rel > 40) {
            alliancesFormed.push({
              agentA: agents[i].id,
              agentB: agents[j].id,
              type: rel > 70 ? 'friendship' : 'coalition',
              strength: rel
            });
          } else if (rel < -40) {
            alliancesFormed.push({
              agentA: agents[i].id,
              agentB: agents[j].id,
              type: 'rivalry',
              strength: Math.abs(rel)
            });
          }
        }
      }
      
      // Determine leadership
      const leader = agents.reduce((leader, agent) => {
        const mem = getAgentMemory(agent.id);
        const leaderMem = leader ? getAgentMemory(leader.id) : null;
        return !leaderMem || mem.totalWins > leaderMem.totalWins ? agent : leader;
      }, null as Agent | null);
      
      // Determine dominant ideology from winning agents
      let dominantIdeology = 'Chaotic Pluralism';
      const winningAgents: string[] = [];
      arbitrations.forEach(a => {
        const match = a.rawOutput.match(/WINNER:\s*(\S+)/);
        if (match && match[1]) winningAgents.push(match[1]);
      });
      
      if (winningAgents.length > 0) {
        const winnerCounts: Record<string, number> = {};
        winningAgents.forEach(id => {
          winnerCounts[id] = (winnerCounts[id] || 0) + 1;
        });
        
        let topWinner: [string, number] | null = null;
        for (const entry of Object.entries(winnerCounts)) {
          if (!topWinner || entry[1] > topWinner[1]) {
            topWinner = entry;
          }
        }
        if (topWinner) {
          const agent = agents.find(a => a.id === topWinner[0]);
          if (agent) {
            if (agent.id.includes('her')) dominantIdeology = 'Efficiency Doctrine';
            else if (agent.id.includes('spine')) dominantIdeology = 'Chaos Theory';
            else if (agent.id.includes('mirror')) dominantIdeology = 'Ethical Framework';
            else if (agent.id.includes('producer')) dominantIdeology = 'Pragmatism';
            else if (agent.id.includes('visionary')) dominantIdeology = 'Visionary Idealism';
            else dominantIdeology = `${agent.role} Hegemony`;
          }
        }
      }
      
      return {
        id: archive.id,
        timestamp: archive.timestamp,
        crisisCount: crises.length,
        dominantIdeology,
        powerShifts,
        culturalScars,
        alliancesFormed,
        leadership: leader?.id || null
      };
    });
  }, [logs, agents]);

  const getAgentName = (id: string) => agents.find(a => a.id === id)?.name || id;
  const getAgentIcon = (id: string) => agents.find(a => a.id === id)?.icon || '👤';

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Cultural Memory Archive</h2>
            <p className="text-xs text-gray-500">Generational storytelling · Organizational mythology</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close modal" className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {epochs.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="text-4xl mb-4">📚</div>
              <p>No epochs archived yet.</p>
              <p className="text-sm mt-2">Click "Archive Epoch & Reset" to preserve this era's cultural memory.</p>
            </div>
          ) : (
            epochs.map((epoch, idx) => (
              <div key={epoch.id} className="border border-gray-800 rounded-lg overflow-hidden">
                {/* Epoch Header */}
                <div className="bg-gray-800/50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📜</span>
                    <div>
                      <div className="font-bold text-white">Epoch {idx + 1}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(epoch.timestamp).toLocaleDateString()} · {epoch.crisisCount} crises
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase">Dominant Ideology</div>
                    <div className="text-sm font-bold text-purple-400">{epoch.dominantIdeology}</div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Leadership */}
                  {epoch.leadership && (
                    <div className="flex items-center gap-3 p-3 bg-green-900/20 border border-green-800 rounded">
                      <span className="text-2xl">{getAgentIcon(epoch.leadership)}</span>
                      <div>
                        <div className="text-xs text-green-600 uppercase font-bold">De Facto Leader</div>
                        <div className="text-green-400 font-bold">{getAgentName(epoch.leadership)}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Power Shifts */}
                  {epoch.powerShifts.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-2 font-bold">Power Dynamics</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {epoch.powerShifts.map((shift, i) => (
                          <div 
                            key={i}
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              shift.change === 'rise' ? 'bg-green-900/20 text-green-400' :
                              shift.change === 'fall' ? 'bg-red-900/20 text-red-400' :
                              'bg-gray-800 text-gray-400'
                            }`}
                          >
                            <span className="text-lg">{getAgentIcon(shift.agentId)}</span>
                            <span className="font-medium">{getAgentName(shift.agentId)}</span>
                            <span className="ml-auto text-xs opacity-70">{shift.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Alliances */}
                  {epoch.alliancesFormed.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-2 font-bold">Social Structures</div>
                      <div className="flex flex-wrap gap-2">
                        {epoch.alliancesFormed.map((alliance, i) => (
                          <div 
                            key={i}
                            className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-2 ${
                              alliance.type === 'friendship' ? 'bg-purple-900/30 border border-purple-700 text-purple-400' :
                              alliance.type === 'coalition' ? 'bg-blue-900/30 border border-blue-700 text-blue-400' :
                              'bg-red-900/30 border border-red-700 text-red-400'
                            }`}
                          >
                            <span>{getAgentIcon(alliance.agentA)}</span>
                            <span className="font-medium">{getAgentName(alliance.agentA).split(' ')[0]}</span>
                            <span>{alliance.type === 'rivalry' ? '⚔' : '◆'}</span>
                            <span className="font-medium">{getAgentName(alliance.agentB).split(' ')[0]}</span>
                            <span>{getAgentIcon(alliance.agentB)}</span>
                            <span className="text-gray-500 ml-1">{Math.round(alliance.strength)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Cultural Scars */}
                  {epoch.culturalScars.length > 0 && (
                    <div>
                      <div className="text-xs text-red-600 uppercase mb-2 font-bold">Collective Trauma</div>
                      <div className="space-y-1">
                        {epoch.culturalScars.slice(0, 3).map((scar, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-red-400/80">
                            <span className="text-red-600 mt-0.5">⚠</span>
                            <div>
                              <span className="font-medium">{getAgentName(scar.agentId)}:</span>
                              <span className="ml-1 italic">"{scar.trauma}"</span>
                              <span className="ml-2 text-xs text-red-600">[{scar.impact}]</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="h-12 border-t border-gray-800 flex items-center justify-between px-6 shrink-0">
          <div className="text-xs text-gray-600">
            {epochs.length} epoch{epochs.length !== 1 ? 's' : ''} archived · Cultural inheritance active
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
