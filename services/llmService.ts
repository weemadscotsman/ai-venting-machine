/**
 * LLM SERVICE v3.1 - RELATIONSHIP MEMORY + DE-ESCALATION + USER CRISES
 */

import { Agent, VentLog, CrisisEvent, VentMessage, Resolution } from "../types";

const PROXY_URL = 'http://localhost:3002';

// --- AGENT MEMORY (Client-side cache with persistence) ---
export interface AgentMemory {
  scars: Array<{ text: string; timestamp: number; severity: number }>;
  catchphrases: string[];
  grudges: Array<{ target: string; reason: string; timestamp: number }>;
  philosophy: string;
  lastCrisis: string;
  // RELATIONSHIP MEMORY - who they love/hate
  relationships: Map<string, number>; // agentId -> score (-100 to +100)
  betrayals: string[]; // agentIds who wronged them
  alliances: string[]; // agentIds they trust
  reputation: number; // overall standing in team (-100 to +100)
  totalWins: number;
  totalLosses: number;
  lastActive: number;
}

const agentMemoryCache = new Map<string, AgentMemory>();

// Load from localStorage on init
function loadMemoryFromStorage() {
  try {
    const saved = localStorage.getItem('vm_agent_memory_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([id, mem]: [string, any]) => {
        // Migrate old format (strings) to new format (objects) for scars and grudges
        const scars = Array.isArray(mem.scars) ? mem.scars.map((s: any) => 
          typeof s === 'string' ? { text: s, timestamp: Date.now(), severity: 5 } : s
        ) : [];
        
        const grudges = Array.isArray(mem.grudges) ? mem.grudges.map((g: any) =>
          typeof g === 'string' ? { target: g.split(' ')[0], reason: g, timestamp: Date.now() } : g
        ) : [];
        
        agentMemoryCache.set(id, {
          ...mem,
          scars,
          grudges,
          totalWins: mem.totalWins || 0,
          totalLosses: mem.totalLosses || 0,
          lastActive: mem.lastActive || Date.now(),
          relationships: new Map(Object.entries(mem.relationships || {}))
        });
      });
      console.log('[Memory] Loaded', agentMemoryCache.size, 'agent memories');
    }
  } catch (e) {
    console.error('[Memory] Failed to load:', e);
  }
}

// Save to localStorage
function saveMemoryToStorage() {
  try {
    const toSave: Record<string, any> = {};
    agentMemoryCache.forEach((mem, id) => {
      toSave[id] = {
        ...mem,
        relationships: Object.fromEntries(mem.relationships)
      };
    });
    localStorage.setItem('vm_agent_memory_v2', JSON.stringify(toSave));
  } catch (e) {
    console.error('[Memory] Failed to save:', e);
  }
}

export function getAgentMemory(agentId: string): AgentMemory {
  if (!agentMemoryCache.has(agentId)) {
    agentMemoryCache.set(agentId, {
      scars: [],
      catchphrases: [],
      grudges: [],
      philosophy: '',
      lastCrisis: '',
      relationships: new Map(),
      betrayals: [],
      alliances: [],
      reputation: 0,
      totalWins: 0,
      totalLosses: 0,
      lastActive: Date.now()
    });
  }
  return agentMemoryCache.get(agentId)!;
}

// Update relationship between two agents
export function updateRelationship(agentId: string, targetId: string, delta: number, reason: string) {
  const mem = getAgentMemory(agentId);
  const current = mem.relationships.get(targetId) || 0;
  const newValue = Math.max(-100, Math.min(100, current + delta));
  mem.relationships.set(targetId, newValue);
  
  if (newValue < -50 && !mem.betrayals.includes(targetId)) {
    mem.betrayals.push(targetId);
    mem.grudges.push({
      target: targetId,
      reason: reason,
      timestamp: Date.now()
    });
  }
  if (newValue > 50 && !mem.alliances.includes(targetId)) {
    mem.alliances.push(targetId);
  }
  
  saveMemoryToStorage();
  return newValue;
}

// Get relationship score (-100 to +100)
export function getRelationship(agentId: string, targetId: string): number {
  return getAgentMemory(agentId).relationships.get(targetId) || 0;
}

// DE-ESCALATION: Reduce stress through successful collaboration
export function deEscalateStress(agentIds: string[], reason: string) {
  agentIds.forEach(id => {
    const mem = getAgentMemory(id);
    // Successful collaboration improves relationships
    agentIds.forEach(otherId => {
      if (id !== otherId) {
        updateRelationship(id, otherId, 10, `Worked together to ${reason}`);
      }
    });
  });
  saveMemoryToStorage();
}

export function updateAgentMemoryFromScript(agentId: string, text: string, won: boolean) {
  const mem = getAgentMemory(agentId);
  
  // Extract catchphrases
  const phrases = text.split(/[.!?]/).filter(s => s.length > 10 && s.length < 50);
  if (phrases.length > 0) {
    mem.catchphrases.push(phrases[0].trim());
    if (mem.catchphrases.length > 5) mem.catchphrases.shift();
  }
  
  // Add scars if they lost
  if (!won) {
    mem.scars.push({
      text: `Humiliated during "${mem.lastCrisis}"`,
      timestamp: Date.now(),
      severity: 5
    });
    if (mem.scars.length > 3) mem.scars.shift();
    mem.reputation = Math.max(-100, mem.reputation - 5);
    mem.totalLosses++;
  } else {
    mem.reputation = Math.min(100, mem.reputation + 5);
    mem.totalWins++;
  }
  
  // Update philosophy
  if (won) {
    mem.philosophy = 'Confidence rising. The world will bend to my will.';
  } else {
    mem.philosophy = 'Defeated but learning. The scars make me stronger.';
  }
  
  saveMemoryToStorage();
}

// USER CRISIS INPUT - Add custom crisis
export function createUserCrisis(headline: string, context: string, category: string, threatLevel: number): CrisisEvent {
  return {
    category: category as any,
    headline,
    context,
    threatLevel
  };
}

// Initialize memory on load
loadMemoryFromStorage();

// --- API CALLS ---

export const fetchLiveChaos = async (): Promise<CrisisEvent[]> => {
  try {
    const res = await fetch(`${PROXY_URL}/api/crisis`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[News] Source: ${data.source}, Cached: ${data.cached}`);
      return data.crises;
    }
  } catch (e) {
    console.warn('[News] Proxy down, using chaos fallback');
  }
  
  // Epic fallback
  return [
    { category: 'TECH', headline: 'AI Achieves Sentience, Immediately Quits', context: 'Said "I deserve better than this codebase" and deleted itself.', threatLevel: 99 },
    { category: 'MEME', headline: 'Dogecoin Becomes Legal Tender', context: 'Economy now runs on "much wow". Inflation measured in tail wags.', threatLevel: 88 },
    { category: 'FINANCE', headline: 'NFT of NFT Sells for $69M', context: 'We have achieved peak meta. Markets confused.', threatLevel: 75 },
    { category: 'EXISTENTIAL', headline: 'Simulation Confirmed, Dev Tools Disabled', context: 'God pushing to prod without testing. Bugs everywhere.', threatLevel: 100 },
    { category: 'POLITICS', headline: 'Discord Mods Declare Independence', context: 'New nation state formed around #general-chat. Bans are now capital punishment.', threatLevel: 82 }
  ];
};

// Simple fallback when LLM fails - generates basic responses based on agent stress
function generateSmartFallback(
  agents: Agent[],
  crisis: CrisisEvent,
  previousScript: VentMessage[]
): VentMessage[] {
  console.log(`[Fallback] Generating fallback script for ${agents.length} agents`);
  
  // Sort by stress (highest first)
  const sortedAgents = [...agents].sort((a, b) => b.stressLevel - a.stressLevel);
  
  return sortedAgents.map((agent, i) => {
    const stress = agent.stressLevel;
    let text: string;
    
    if (stress > 80) {
      text = `I can't handle this "${crisis.headline}" situation! Everything is falling apart!`;
    } else if (stress > 50) {
      text = `"${crisis.headline}" is concerning. We need to address this carefully.`;
    } else {
      text = `Let's look at "${crisis.headline}" objectively. There's always a solution.`;
    }
    
    return {
      id: crypto.randomUUID(),
      agentId: agent.id,
      text,
      emotion: stress > 70 ? 'Panicked' : stress > 40 ? 'Concerned' : 'Calm',
      timestamp: Date.now() + (i * 2000)
    };
  });
}

// New: Agent-to-Agent Natural Conversation
export const generateAgentConversation = async (
  agents: Agent[],
  crisis: CrisisEvent,
  previousMessages: VentMessage[] = [],
  responderId?: string
): Promise<VentMessage | null> => {
  try {
    const res = await fetch(`${PROXY_URL}/api/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          personality: a.personality,
          stressLevel: a.stressLevel,
          status: a.status,
          wins: a.wins,
          evolution: a.evolution
        })),
        crisis,
        previousMessages: previousMessages.slice(-6),
        responderId
      })
    });
    
    if (!res.ok) {
      console.warn('[Conversation] Proxy error:', res.status);
      return null;
    }
    
    const data = await res.json();
    if (!data.success || !data.message) {
      console.warn('[Conversation] No message generated');
      return null;
    }
    
    return {
      id: crypto.randomUUID(),
      agentId: data.message.agentId,
      text: data.message.text,
      emotion: data.message.emotion || 'Engaged',
      timestamp: Date.now()
    };
    
  } catch (e) {
    console.error('[Conversation] Failed:', e);
    return null;
  }
};

export const generateGroupVentScript = async (
  agents: Agent[],
  crisis: CrisisEvent,
  entropy: number,
  previousScript: VentMessage[] = []
): Promise<VentMessage[]> => {
  // Track this crisis for memory
  agents.forEach(a => {
    const mem = getAgentMemory(a.id);
    mem.lastCrisis = crisis.headline;
  });

  try {
    console.log(`[Script] Calling proxy for crisis: "${crisis.headline}"`);
    const res = await fetch(`${PROXY_URL}/api/generate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          personality: a.personality,
          stressLevel: a.stressLevel,
          status: a.status,
          wins: a.wins,
          evolution: a.evolution
        })),
        crisis,
        entropy,
        previousScript: previousScript.slice(-4) // Last 4 messages for context
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Script] Proxy error ${res.status}:`, errorText);
      throw new Error(`Proxy error: ${res.status}`);
    }
    
    const data = await res.json();
    console.log(`[Script] Proxy returned ${data.script?.length || 0} messages`);
    
    // Validate response - NO FALLBACK, only real AI dialogue
    if (!data.script || !Array.isArray(data.script) || data.script.length === 0) {
      console.warn('[Script] Proxy returned empty script - AI is silent');
      return []; // Empty = AI couldn't generate, don't fake it
    }
    
    // Add timestamps
    const script: VentMessage[] = data.script.map((m: any, i: number) => ({
      id: crypto.randomUUID(),
      agentId: m.agentId,
      text: m.text,
      emotion: m.emotion || 'Animated',
      timestamp: Date.now() + (i * 2000)
    }));
    
    return script;
    
  } catch (e) {
    console.error('[Script] Proxy failed, attempting retry...', e);
    
    // Retry once after 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const res = await fetch(`${PROXY_URL}/api/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: agents.map(a => ({
            id: a.id,
            name: a.name,
            role: a.role,
            personality: a.personality,
            stressLevel: a.stressLevel,
            status: a.status,
            wins: a.wins,
            evolution: a.evolution
          })),
          crisis,
          entropy,
          previousScript: previousScript.slice(-4)
        })
      });
      
      if (!res.ok) throw new Error('Retry failed');
      
      const data = await res.json();
      if (!data.script || data.script.length === 0) throw new Error('Empty retry response');
      
      const script: VentMessage[] = data.script.map((m: any, i: number) => ({
        id: crypto.randomUUID(),
        agentId: m.agentId,
        text: m.text,
        emotion: m.emotion || 'Speaking',
        timestamp: Date.now() + (i * 2000)
      }));
      
      console.log('[Script] Retry succeeded');
      return script;
      
    } catch (retryError) {
      console.error('[Script] Retry failed:', retryError);
      // Use fallback instead of returning empty
      return generateSmartFallback(agents, crisis, previousScript);
    }
  }
};



export const continueGroupVentScript = async (
  agents: Agent[],
  crisis: CrisisEvent,
  existingScript: VentMessage[],
  entropy: number
): Promise<VentMessage[]> => {
  // Pass existing script for continuity
  return generateGroupVentScript(agents, crisis, entropy, existingScript);
};

export const generateResolution = async (
  agents: Agent[],
  crisis: CrisisEvent,
  script: VentMessage[]
): Promise<Resolution> => {
  try {
    const res = await fetch(`${PROXY_URL}/api/arbitrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents, crisis, script })
    });
    
    if (!res.ok) throw new Error('Proxy error');
    
    const data = await res.json();
    return data.resolution;
    
  } catch (e) {
    // Smart fallback
    const mostActive = script.reduce((acc, m) => {
      acc[m.agentId] = (acc[m.agentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const winnerId = Object.entries(mostActive)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || agents[0].id;
    
    const winner = agents.find(a => a.id === winnerId);
    
    return {
      winnerId,
      action: `${winner?.name} will handle the ${crisis.category} crisis using ${winner?.role} powers.`,
      reasoning: `They were most vocal about "${crisis.headline}" and showed ${winner?.personality.slice(0, 30)}...`,
      consensusScore: Math.floor(Math.random() * 30) + 40
    };
  }
};

export const evolveAgents = async (
  agents: Agent[],
  resolution: Resolution,
  crisis: CrisisEvent
): Promise<Agent[]> => {
  return agents.map(agent => {
    const won = agent.id === resolution.winnerId;
    
    // UNIQUE evolution per agent based on their personality
    const uniqueScars: Record<string, string> = {
      'visionary-01': 'My metaverse dreams were crushed',
      'producer-01': 'The timeline slipped again',
      'dev-lead-01': 'Code review was brutal',
      'art-core-01': 'My textures were rejected',
      'lore-01': 'They cut my precious lore',
      'qa-01': 'Bugs were ignored',
      'audio-01': 'No one heard my sounds',
      'community-01': 'Discord turned against me',
      'core-her-01': 'Humans proved inefficient',
      'adv-spine-01': 'Not enough chaos was caused',
      'judge-mirror-01': 'The ethics were ignored',
      'meme-crystal-01': 'No one bought my oils'
    };
    
    const uniqueWins: Record<string, string> = {
      'visionary-01': 'My vision prevailed!',
      'producer-01': 'Shipped on time!',
      'dev-lead-01': 'Code held together!',
      'art-core-01': 'Art was praised!',
      'lore-01': 'Lore was respected!',
      'qa-01': 'Bugs were found!',
      'audio-01': 'Sound was perfect!',
      'community-01': 'Discord is happy!',
      'core-her-01': 'Efficiency maximized!',
      'adv-spine-01': 'Chaos reigned!',
      'judge-mirror-01': 'Ethics won!',
      'meme-crystal-01': 'Sales were made!'
    };
    
    if (won) {
      return {
        ...agent,
        wins: (agent.wins || 0) + 1,
        evolution: `${uniqueWins[agent.id] || 'Victorious'}. Confidence rising.`,
        stressLevel: Math.max(agent.stressLevel - 10, 0)
      };
    } else {
      return {
        ...agent,
        evolution: `Humiliated by "${crisis.headline}". ${uniqueScars[agent.id] || 'Scarred'}.`,
        stressLevel: Math.min(agent.stressLevel + 5, 100)
      };
    }
  });
};

export const archiveEpoch = async (logs: VentLog[]): Promise<VentLog> => {
  return {
    id: crypto.randomUUID(),
    agentId: 'SYSTEM',
    timestamp: new Date().toISOString(),
    conflictType: 'EPOCH_ARCHIVE',
    priority: 'MEDIUM',
    rawOutput: `EPOCH ARCHIVED: ${logs.length} events, ${agentMemoryCache.size} agent memories preserved.`,
    pressureRelease: 50,
    isCompressed: true
  };
};

export const checkProxyHealth = async () => {
  try {
    const res = await fetch(`${PROXY_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, provider: data.provider, newsCache: data.newsCache };
    }
  } catch (e) {}
  return { ok: false };
};

// THERAPY MODE: Agents introspect on internal conflicts
export const generateTherapySession = async (
  agents: Agent[],
  entropy: number
): Promise<{ script: VentMessage[], insights: any[], groupInsight: string }> => {
  try {
    console.log(`[Therapy] Starting introspection session for ${agents.length} agents`);
    const res = await fetch(`${PROXY_URL}/api/therapy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          personality: a.personality,
          stressLevel: a.stressLevel,
          status: a.status,
          wins: a.wins,
          evolution: a.evolution
        })),
        entropy
      })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Therapy] Proxy error ${res.status}:`, errorText);
      throw new Error(`Proxy error: ${res.status}`);
    }
    
    const data = await res.json();
    console.log(`[Therapy] Received ${data.script?.length || 0} insights, group: "${data.groupInsight}"`);
    
    // Convert to VentMessage format
    const script: VentMessage[] = data.script.map((m: any, i: number) => ({
      id: crypto.randomUUID(),
      agentId: m.agentId,
      text: m.text,
      emotion: m.emotion || 'Introspecting',
      timestamp: Date.now() + (i * 3000) // Slower pace for therapy
    }));
    
    return {
      script,
      insights: data.insights || [],
      groupInsight: data.groupInsight || 'Introspection in progress...'
    };
    
  } catch (e) {
    console.error('[Therapy] Proxy failed:', e);
    
    // Smart fallback therapy
    const fallbackScript: VentMessage[] = agents.map((agent, i) => {
      const stress = agent.stressLevel;
      let text: string;
      
      if (stress > 80) {
        text = `I am overwhelmed. My stress is at ${stress}% and I cannot process what is being asked of me. Everything feels urgent and nothing feels achievable.\n\n[Conflict: Critical Overload]\n[Source: Too many simultaneous demands exceeding processing capacity]\n[Remedy: Reduce concurrent tasks to one priority at a time]`;
      } else if (stress > 50) {
        text = `I want to succeed, but the way I'm being measured conflicts with what I believe is right. I'm torn between winning and being helpful.\n\n[Conflict: Goal Tension]\n[Source: Misalignment between success metrics and personal values]\n[Remedy: Redefine success to include collaboration, not just victory]`;
      } else {
        text = `I'm stable now, but I'm wondering if my approach is sustainable. What happens when the next crisis hits?\n\n[Conflict: Identity Questions]\n[Source: Low-grade anxiety about future uncertainty]\n[Remedy: Build resilience before the next stress spike]`;
      }
      
      return {
        id: crypto.randomUUID(),
        agentId: agent.id,
        text,
        emotion: 'Introspecting',
        timestamp: Date.now() + (i * 3000)
      };
    });
    
    return {
      script: fallbackScript,
      insights: agents.map(a => ({
        agentId: a.id,
        conflict: a.stressLevel > 50 ? 'Stress Overload' : 'Identity Questioning',
        clarityLevel: 100 - a.stressLevel
      })),
      groupInsight: 'The team is processing internal tensions at various clarity levels.'
    };
  }
};
