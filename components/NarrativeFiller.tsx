
import React, { useEffect, useState } from 'react';
import { Agent } from '../types';
import { getAgentMemory } from '../services/llmService';

interface NarrativeFillerProps {
  agents: Agent[];
  systemPressure: number;
}

interface FillerState {
  type: 'idle' | 'tension' | 'backchannel' | 'rumor' | 'reflection';
  text: string;
  agents: string[];
  timestamp: number;
}

// Idle state narratives - background chatter when no crisis is active
const IDLE_NARRATIVES = [
  "The hum of servers fills the silence.",
  "Someone is making coffee. No one speaks.",
  "A Slack notification echoes. It is ignored.",
  "The cursor blinks. Waiting.",
  "Code compiles. Errors: 0. Tension: undefined.",
  "An email sits unread. It has sat unread for days.",
  "The ventilation system cycles. Breathe in, out.",
  "A chair creaks. Someone shifts weight.",
  "The build server yawns in green.",
  "Tabs accumulate like fallen leaves.",
];

// Tension narratives - based on system pressure
const TENSION_NARRATIVES = [
  "You can feel it. Something is coming.",
  "Conversations end abruptly. Eyes avoid contact.",
  "The air conditioning seems louder than usual.",
  "Someone laughed too hard at a minor joke. Release valve.",
  "The silence has weight. Density. Mass.",
  "A phone buzzes. Three people check theirs.",
  "The Slack status dots flicker like uncertain stars.",
];

// Backchannel narratives - implied relationships
const BACKCHANNEL_NARRATIVES = [
  "{A} glances at {B}. A look passes between them.",
  "{A} and {B} are whispering near the espresso machine.",
  "{A} forwarded an email to {B}. Subject: 'Thoughts?'",
  "{A} defended {B} in the thread. Everyone noticed.",
  "{A} is explaining something to {B}. {B} is not listening.",
];

// Rumor narratives - based on agent states
const RUMOR_NARRATIVES = [
  "Word is {A} might pivot the entire project. Again.",
  "Someone heard {A} is interviewing elsewhere.",
  "Rumor: {A} has been refactoring the same function for three days.",
  "They say {A} snapped in the standup. No witnesses.",
  "Whispers of a {A} side project. Disloyalty or innovation?",
];

// Reflection narratives - philosophical asides
const REFLECTION_NARRATIVES = [
  "What are we even building anymore?",
  "The code outlives the intention. Always.",
  "Every feature is a promise. Every bug, a broken vow.",
  "We ship not when it is ready, but when fear exceeds hope.",
  "The metaverse was supposed to save us. The metaverse was a lie.",
  "Once, this team believed in something.",
];

export const NarrativeFiller: React.FC<NarrativeFillerProps> = ({ agents, systemPressure }) => {
  const [currentNarrative, setCurrentNarrative] = useState<FillerState | null>(null);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const generateNarrative = (): FillerState => {
      const now = Date.now();
      
      // Determine narrative type based on pressure and randomness
      const rand = Math.random();
      let type: FillerState['type'] = 'idle';
      
      if (systemPressure > 70) {
        type = rand > 0.4 ? 'tension' : rand > 0.2 ? 'rumor' : 'reflection';
      } else if (systemPressure > 40) {
        type = rand > 0.6 ? 'backchannel' : rand > 0.3 ? 'tension' : 'idle';
      } else {
        type = rand > 0.7 ? 'idle' : rand > 0.4 ? 'backchannel' : 'reflection';
      }
      
      let text = '';
      let involvedAgents: string[] = [];
      
      switch (type) {
        case 'idle':
          text = IDLE_NARRATIVES[Math.floor(Math.random() * IDLE_NARRATIVES.length)];
          break;
          
        case 'tension':
          text = TENSION_NARRATIVES[Math.floor(Math.random() * TENSION_NARRATIVES.length)];
          break;
          
        case 'backchannel':
          if (agents.length >= 2) {
            const shuffled = [...agents].sort(() => Math.random() - 0.5);
            involvedAgents = [shuffled[0].id, shuffled[1].id];
            const template = BACKCHANNEL_NARRATIVES[Math.floor(Math.random() * BACKCHANNEL_NARRATIVES.length)];
            text = template.replace('{A}', shuffled[0].name.split(' ')[0]).replace('{B}', shuffled[1].name.split(' ')[0]);
          } else {
            text = IDLE_NARRATIVES[0];
          }
          break;
          
        case 'rumor':
          if (agents.length > 0) {
            const agent = agents[Math.floor(Math.random() * agents.length)];
            involvedAgents = [agent.id];
            const template = RUMOR_NARRATIVES[Math.floor(Math.random() * RUMOR_NARRATIVES.length)];
            text = template.replace('{A}', agent.name.split(' ')[0]);
          } else {
            text = IDLE_NARRATIVES[0];
          }
          break;
          
        case 'reflection':
          text = REFLECTION_NARRATIVES[Math.floor(Math.random() * REFLECTION_NARRATIVES.length)];
          break;
      }
      
      return { type, text, agents: involvedAgents, timestamp: now };
    };

    // Initial narrative
    setCurrentNarrative(generateNarrative());
    
    // Cycle narratives every 8-15 seconds
    const interval = setInterval(() => {
      setFadeState('out');
      
      setTimeout(() => {
        setCurrentNarrative(generateNarrative());
        setFadeState('in');
      }, 500);
    }, 8000 + Math.random() * 7000);
    
    return () => clearInterval(interval);
  }, [agents, systemPressure]);

  if (!currentNarrative) return null;

  const getTypeIcon = (type: FillerState['type']) => {
    switch (type) {
      case 'idle': return '◐';
      case 'tension': return '◕';
      case 'backchannel': return '◎';
      case 'rumor': return '◉';
      case 'reflection': return '◈';
    }
  };

  const getTypeColor = (type: FillerState['type']) => {
    switch (type) {
      case 'idle': return 'text-gray-600';
      case 'tension': return 'text-amber-600';
      case 'backchannel': return 'text-blue-600';
      case 'rumor': return 'text-purple-600';
      case 'reflection': return 'text-cyan-600';
    }
  };

  const getTypeLabel = (type: FillerState['type']) => {
    switch (type) {
      case 'idle': return 'ATMOSPHERE';
      case 'tension': return 'PRESSURE';
      case 'backchannel': return 'BACKCHANNEL';
      case 'rumor': return 'GRAPEVINE';
      case 'reflection': return 'MOMENT';
    }
  };

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-opacity duration-500 ${fadeState === 'in' ? 'opacity-100' : 'opacity-0'}`}>
      {/* Ambient decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-gray-600 rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 border border-gray-700 rounded-full animate-pulse" style={{ animationDuration: '6s' }} />
      </div>
      
      {/* Type indicator */}
      <div className={`flex items-center gap-2 mb-6 ${getTypeColor(currentNarrative.type)}`}>
        <span className="text-lg opacity-50">{getTypeIcon(currentNarrative.type)}</span>
        <span className="text-[10px] tracking-[0.3em] font-bold opacity-50">{getTypeLabel(currentNarrative.type)}</span>
      </div>
      
      {/* Main narrative text */}
      <div className="text-center max-w-md">
        <p className="text-lg text-gray-400 italic leading-relaxed font-light">
          {currentNarrative.text}
        </p>
      </div>
      
      {/* Agent indicators for backchannel/rumor */}
      {currentNarrative.agents.length > 0 && (
        <div className="flex items-center gap-4 mt-6">
          {currentNarrative.agents.map(agentId => {
            const agent = agents.find(a => a.id === agentId);
            if (!agent) return null;
            return (
              <div key={agentId} className="flex items-center gap-2 opacity-50">
                <span className="text-lg">{agent.icon}</span>
                <span className="text-xs text-gray-500">{agent.name.split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Atmospheric footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <div className="text-[9px] text-gray-700 font-mono">
          {systemPressure > 70 ? '/// ATMOSPHERE: VOLATILE' : 
           systemPressure > 40 ? '/// ATMOSPHERE: TENSE' : 
           '/// ATMOSPHERE: STABLE'}
        </div>
      </div>
    </div>
  );
};
