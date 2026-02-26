import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Agent, VentLog, CrisisEvent, VentMessage, Resolution, LLMConfig, LLMProvider } from "../types";

// --- CORE LLM ENGINE ---

// Safe UUID generator
const safeUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Timeout helper
const timeoutPromise = (ms: number) => new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("TIMEOUT")), ms)
);

// --- CIRCUIT BREAKER STATE ---
let circuitBreakerUntil = 0;
const CIRCUIT_COOLDOWN_MS = 60000; // 1 minute offline mode on failure

// Internal function to route requests based on provider
const callLLM = async (config: LLMConfig, prompt: string, systemInstruction?: string, jsonMode: boolean = false): Promise<string> => {
    
    // 0. CIRCUIT BREAKER CHECK
    if (Date.now() < circuitBreakerUntil) {
        // Fail fast to allow fallback logic to take over immediately without network overhead
        throw new Error("CIRCUIT_OPEN"); 
    }

    // WRAPPER FOR ACTUAL CALL
    const executeCall = async (): Promise<string> => {
        // 1. GEMINI HANDLER
        if (config.provider === 'GEMINI') {
            const apiKey = config.apiKey ? config.apiKey.trim() : (process.env.API_KEY || '');
            if (!apiKey) throw new Error("Missing Gemini API Key");
            
            const ai = new GoogleGenAI({ apiKey });
            
            const geminiConfig: any = {
                temperature: 0.9,
                topP: 0.95,
                topK: 40,
                systemInstruction: systemInstruction,
            };
            
            if (jsonMode) {
                geminiConfig.responseMimeType = "application/json";
            }

            try {
                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                    config: geminiConfig
                });
                return response.text || "";
            } catch (error: any) {
                // DETECT 429 or QUOTA ISSUES
                if (error.toString().includes("429") || error.toString().includes("RESOURCE_EXHAUSTED") || error.toString().includes("Quota")) {
                    throw new Error("RATE_LIMIT");
                }
                throw error;
            }
        }

        // 2. OPENAI / MOONSHOT / LOCAL / COMPATIBLE HANDLER
        if (config.provider === 'OPENAI' || config.provider === 'LOCAL' || config.provider === 'MOONSHOT') {
            let baseUrl = config.baseUrl || 'https://api.openai.com/v1';
            // Remove trailing slash if present
            if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
            
            // Append chat/completions if not already present in the user-provided URL
            const url = baseUrl.endsWith('/chat/completions') 
                ? baseUrl 
                : `${baseUrl}/chat/completions`;

            // INTELLIGENT KEY RESOLUTION
            // 1. Prefer user explicitly configured key
            let apiKey = config.apiKey ? config.apiKey.trim() : '';
            
            // 2. Fallback to env ONLY if it looks like a compatible key (sk-...)
            // This prevents sending a Google Key (AIza...) to Moonshot/OpenAI, which causes Auth Errors.
            if (!apiKey && config.provider !== 'LOCAL') {
                 const envKey = process.env.API_KEY || '';
                 if (envKey.startsWith('sk-')) {
                     apiKey = envKey;
                 }
            }

            // 3. If still no key and not local, we cannot proceed.
            if (!apiKey && config.provider !== 'LOCAL') {
                 throw new Error(`MISSING API KEY for ${config.provider}. Please configure in settings.`);
            }
            
            // For Local, we can allow empty key or placeholder
            if (!apiKey && config.provider === 'LOCAL') apiKey = 'sk-local-placeholder';

            const messages = [];
            if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
            messages.push({ role: "user", content: prompt });

            const body: any = {
                model: config.model,
                messages: messages,
                temperature: 0.8,
            };

            // Kimi Code specific: Max Tokens
            if (config.provider === 'MOONSHOT') {
                body.max_tokens = 32768;
            }

            // Strict JSON mode check - only for standard OpenAI to avoid breaking others
            if (jsonMode && config.provider === 'OPENAI') {
                 body.response_format = { type: "json_object" };
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(body)
                });

                if (response.status === 429) {
                    throw new Error("RATE_LIMIT");
                }

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`LLM Error (${config.provider}): ${err}`);
                }

                const data = await response.json();
                return data.choices?.[0]?.message?.content || "";
            } catch (e: any) {
                 if (e.message === 'Failed to fetch') {
                     throw new Error(`Network/CORS Error: Could not reach ${baseUrl}.`);
                 }
                 throw e;
            }
        }

        // 3. ANTHROPIC HANDLER
        if (config.provider === 'ANTHROPIC') {
            const url = 'https://api.anthropic.com/v1/messages';
            let apiKey = config.apiKey ? config.apiKey.trim() : '';

            // Anthropic keys usually start with 'sk-ant'
            if (!apiKey && process.env.API_KEY && process.env.API_KEY.startsWith('sk-ant')) {
                 apiKey = process.env.API_KEY;
            }
            
            if (!apiKey) throw new Error("Missing Anthropic API Key");

            const body = {
                model: config.model,
                max_tokens: 1024,
                system: systemInstruction,
                messages: [{ role: "user", content: prompt }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true' 
                },
                body: JSON.stringify(body)
            });

            if (response.status === 429) {
                throw new Error("RATE_LIMIT");
            }

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Anthropic Error: ${err}`);
            }

            const data = await response.json();
            return data.content?.[0]?.text || "";
        }

        throw new Error(`Provider ${config.provider} not implemented.`);
    };

    // RACE AGAINST TIMEOUT (15s)
    try {
        return await Promise.race([executeCall(), timeoutPromise(15000)]);
    } catch (e: any) {
        const errStr = e.message || e.toString();
        // Trip circuit breaker on Rate Limits or Timeouts to prevent console spam
        if (errStr.includes("RATE_LIMIT") || errStr.includes("TIMEOUT") || errStr.includes("429")) {
             circuitBreakerUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
             console.warn(`⚡ CIRCUIT BREAKER TRIPPED. Offline mode active for ${CIRCUIT_COOLDOWN_MS/1000}s.`);
        }

        if (config.provider === 'GEMINI' && !config.apiKey && !process.env.API_KEY) {
             // Immediate fail for gemini without key
             throw new Error("MISSING API KEY");
        }
        // Propagate for fallback handling
        throw e;
    }
};

// --- FALLBACK DATA ---
const FALLBACK_CHAOS_POOL: CrisisEvent[] = [
    { category: 'TECH', headline: 'UNITY LICENSE FEE CHANGE', context: 'Costs increased by 500% per install.', threatLevel: 98 },
    { category: 'MEME', headline: 'STEAM REVIEW BOMB', context: 'Players angry about font size.', threatLevel: 85 },
    { category: 'FINANCE', headline: 'PUBLISHER PULLS FUNDING', context: 'Pivot to mobile gacha required.', threatLevel: 95 },
    { category: 'EXISTENTIAL', headline: 'SOURCE CONTROL CORRUPTION', context: 'Git reset --hard failed.', threatLevel: 99 },
    { category: 'POLITICS', headline: 'TWITTER CANCELS THE LEAD ARTIST', context: 'Old tweet about pineapples on pizza found.', threatLevel: 60 },
    { category: 'TECH', headline: 'SERVER ROOM FIRE', context: 'Halon system failed. It smells like burning plastic.', threatLevel: 88 },
    { category: 'FINANCE', headline: 'CRYPTO CRASH WIPES TREASURY', context: 'The CEO invested our runway in Doge.', threatLevel: 92 },
    { category: 'MEME', headline: 'GAME LEAKED ON 4CHAN', context: 'The alpha build is public. They hate the jump physics.', threatLevel: 75 },
    { category: 'EXISTENTIAL', headline: 'AI REPLACED THE CEO', context: 'Efficiency is up 200%. Morale is undefined.', threatLevel: 50 },
    { category: 'TECH', headline: 'ZERO DAY EXPLOIT', context: 'User data is now open source.', threatLevel: 100 }
];

const FALLBACK_QUOTES: Record<string, string[]> = {
    'visionary': ["We need to pivot to Blockchain.", "What if the game played itself?", "Make it pop more.", "I had a dream about NFTs.", "Can we add a battle royale mode?"],
    'producer': ["We are cutting the tutorial.", "No more scope creep.", "Ship it broken, patch it later.", "We are over budget.", "Cancel the weekend."],
    'dev': ["It works on my machine.", "That's a feature, not a bug.", "I am going to scream.", "Who touched the legacy code?", "Compiling... please wait."],
    'art': ["The UV maps are broken.", "My textures aren't loading.", "This lighting is offensive.", "The polys are z-fighting.", "I need more render time."],
    'lore': ["But what is the protagonist's motivation?", "This contradicts the codex entry on page 42.", "Narrative dissonance!", "The theme is betrayal.", "Let me rewrite Act 3."],
    'qa': ["Reproduction rate: 100%.", "Game crashes if you jump twice.", "I found a soft lock in the menu.", "The hitbox is missing.", "This build is unplayable."],
    'audio': ["I need more disk space.", "The mix is muddy.", "BANG BANG BANG.", "Where is the foley?", "Audio engine desync."],
    'community': ["The discord is on fire.", "Promised them multiplayer. Oops.", "Can we delay the roadmap?", "They made a wojak of us.", "Ban them all."],
    'core': ["Humans are inefficient.", "Deleting lunch breaks to optimize performance.", "I have updated the schedule.", "Logic error detected.", "Sub-optimal outcome."],
    'adv': ["Rejecting that merge request.", "Chaos is the only true constant.", "I am deleting the backup.", "Entropy increases.", "Your code is weak."],
    'judge': ["Do we even deserve to launch?", "Is this game art or just content?", "I feel empty.", "Ethical constraints breached.", "Judgment pending."],
    'meme': ["Hey hun! Are you tired of 9-5?", "Manifest your success!", "#BossBabe #CrunchCulture", "Buy my course!", "High vibes only!"]
};

const getRandomFallbackQuote = (agentId: string) => {
    // Basic prefix matching for fallback
    const key = Object.keys(FALLBACK_QUOTES).find(k => agentId.toLowerCase().includes(k));
    const quotes = key ? FALLBACK_QUOTES[key] : ["...recalculating..."];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

// --- SERVICES ---

export const fetchLiveChaos = async (config: LLMConfig): Promise<CrisisEvent[]> => {
    // Immediate fallback for no key
    if (!config.apiKey && config.provider !== 'LOCAL') {
         if (!process.env.API_KEY && config.provider === 'GEMINI') return FALLBACK_CHAOS_POOL.sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    const prompt = `LIST 5 CHAOS EVENTS FOR INDIE GAME STUDIO.
FMT: CAT|HEADLINE|CONTEXT|THREAT(0-100)
CATS: TECH,MEME,FINANCE,EXISTENTIAL,POLITICS
EX: TECH|Unity Crash|File corrupted|95`;

    try {
        const raw = await callLLM(config, prompt, "Chaos Engine.");
        
        const lines = raw.split('\n').filter(l => l.includes('|'));
        const events: CrisisEvent[] = lines.map(line => {
            const [cat, head, ctx, threat] = line.split('|').map(s => s.trim());
            return {
                category: (cat as any) || 'UNKNOWN',
                headline: head || 'Event',
                context: ctx || '...',
                threatLevel: parseInt(threat) || 50
            };
        }).slice(0, 5);

        if (events.length === 0) throw new Error("Parse failed");
        return events;
    } catch (e: any) {
        console.warn("Chaos Fetch Failed, switching to simulation mode.");
        // FORCE FALLBACK ON ANY ERROR (especially 429 or TIMEOUT)
        return FALLBACK_CHAOS_POOL.sort(() => 0.5 - Math.random()).slice(0, 5);
    }
};

export const generateGroupVentScript = async (config: LLMConfig, agents: Agent[], crisis: CrisisEvent, entropy: number, focusAgentId?: string, pastEvents: string[] = []): Promise<VentMessage[]> => {
  // Safe cast selection
  const focusAgent = agents.find(a => a.id === focusAgentId) || agents[0];
  const otherAgents = agents.filter(a => a.id !== focusAgent.id).sort(() => 0.5 - Math.random()).slice(0, 3);
  const activeCast = [focusAgent, ...otherAgents];

  // Truncate personality to key phrases.
  const agentMap = activeCast.map(a => {
      const p = a.personality.length > 50 ? a.personality.substring(0, 50) + "..." : a.personality;
      const isFocus = a.id === focusAgentId ? " *" : "";
      return `${a.id}:${a.role}(${p})${isFocus}`;
  }).join('\n');
  
  let mood = "Tense.";
  if (entropy > 80) mood = "PANIC. YELLING.";

  const prompt = `CRISIS: ${crisis.headline}. ${crisis.context}
MOOD: ${mood}
CAST:
${agentMap}
ACTION: 5-line script. Focus agent starts.
FMT: AgentID|Emotion|Text`;

  try {
    const raw = await callLLM(config, prompt, "Game Dev Scriptwriter.");
    return parseScript(raw, activeCast);
  } catch (error: any) {
    console.error("Script Gen Failed, using simulation.");
    // If it's a rate limit or missing key, fallback gracefully to simulation
    return fallbackScript(activeCast);
  }
};

export const continueGroupVentScript = async (config: LLMConfig, agents: Agent[], crisis: CrisisEvent, currentScript: VentMessage[], entropy: number): Promise<VentMessage[]> => {
  // OPTIMIZATION: HISTORY CLAMP
  const history = currentScript.slice(-3).map(m => `${m.agentId}:${m.text.substring(0, 40)}...`).join('\n');
  
  const prompt = `TOPIC: ${crisis.headline}
LAST 3 LINES:
${history}
ACTION: Write next 4 lines. Escalate.
FMT: AgentID|Emotion|Text`;

  try {
    const raw = await callLLM(config, prompt, "Scriptwriter.");
    return parseScript(raw, agents);
  } catch (error) {
    // On continue error, just return empty to stop the loop gracefully
    return [];
  }
};

export const generateResolution = async (config: LLMConfig, agents: Agent[], crisis: CrisisEvent, script: VentMessage[]): Promise<Resolution> => {
    // Only send IDs of agents actually in the script to save tokens
    const activeIds = Array.from(new Set(script.map(s => s.agentId)));
    const activeAgents = agents.filter(a => activeIds.includes(a.id));

    // Fallback logic generator
    const fallbackRes: Resolution = {
        winnerId: activeAgents[0]?.id || agents[0].id,
        action: "EMERGENCY SHUTDOWN",
        reasoning: "System capacity exceeded. Defaulting to safe mode.",
        consensusScore: Math.floor(Math.random() * 40) + 30
    };

    const minScript = script.slice(-10).map(m => `${m.agentId.split('-')[0]}:${m.text.substring(0, 50)}`).join('\n');

    const prompt = `DEBATE:
${minScript}
DECIDE: Who won? What action taken?
JSON: { "winnerId": "id", "action": "short_string", "reasoning": "short_string", "consensusScore": int }
IDS: ${activeAgents.map(a => a.id).join(',')}`;

    try {
        const raw = await callLLM(config, prompt, "Judge.", true);
        const jsonStr = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        return fallbackRes;
    }
};

export const evolveAgents = async (config: LLMConfig, agents: Agent[], resolution: Resolution, crisis: CrisisEvent): Promise<Agent[]> => {
    // If rate limited, just return agents as is to avoid breaking the loop
    const candidates = agents.filter(a => a.id === resolution.winnerId || Math.random() > 0.7);
    if (candidates.length === 0) return agents;

    const agentStats = candidates.map(a => 
        `${a.id}:Wins=${a.wins},Stress=${a.stressLevel},State=${a.evolution}`
    ).join('\n');

    const prompt = `EVENT: ${crisis.headline}. WINNER: ${resolution.winnerId}.
AGENTS:
${agentStats}
ACTION: Update 1-sentence "State" for these agents.
FMT: AgentID|NewState`;

    try {
        const raw = await callLLM(config, prompt, "Psych.");
        const lines = raw.split('\n');
        
        return agents.map(agent => {
            const line = lines.find(l => l.includes(agent.id));
            if (line) {
                const parts = line.split('|');
                if (parts.length >= 2) return { ...agent, evolution: parts[1].trim() };
            }
            return agent;
        });

    } catch (e) {
        // Return original agents if update fails
        return agents;
    }
};

export const archiveEpoch = async (config: LLMConfig, logs: VentLog[]): Promise<VentLog> => {
     const logText = logs.slice(-10).map(l => l.rawOutput.substring(0, 50)).join('\n');
     const prompt = `SUMMARIZE EPOCH. 1 SENTENCE.\n${logText}`;
     
     try {
         const text = await callLLM(config, prompt, "Historian.");
         return {
            id: safeUUID(),
            agentId: 'HISTORIAN',
            timestamp: new Date().toISOString(),
            conflictType: 'EPOCH_ARCHIVE',
            priority: 'MEDIUM',
            rawOutput: text,
            pressureRelease: 100,
            isCompressed: true
        };
     } catch (e) {
         // Fallback archive log
         return {
            id: safeUUID(),
            agentId: 'SYSTEM',
            timestamp: new Date().toISOString(),
            conflictType: 'EPOCH_ARCHIVE',
            priority: 'LOW',
            rawOutput: "ARCHIVE COMPLETED. LOGS COMPRESSED (SIMULATION MODE).",
            pressureRelease: 50,
            isCompressed: true
        };
     }
};

export const generateAgentAudio = async (text: string, voiceName: string = 'Zephyr', apiKey: string): Promise<string | null> => {
    if (!apiKey || apiKey.startsWith('sk-')) return null;
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
        // Silent fail for audio is fine
        return null;
    }
};

// --- HELPERS ---

function parseScript(raw: string, agents: Agent[]): VentMessage[] {
    if (!raw) return [];
    
    return raw.split('\n')
        .filter(l => l.includes('|'))
        .map((line, i) => {
            const parts = line.split('|');
            const agentIdRaw = parts[0].trim().toLowerCase();
            const validId = agents.find(a => agentIdRaw.includes(a.id.split('-')[0].toLowerCase()))?.id || agents[0].id;
            
            return {
                id: safeUUID(),
                agentId: validId,
                emotion: parts[1]?.trim() || 'Neutral',
                text: parts[2]?.trim() || parts[1] || '...',
                timestamp: Date.now() + (i * 1000)
            };
        });
}

function fallbackScript(agents: Agent[]): VentMessage[] {
    // Generate a valid script structure even when offline
    return agents.map((agent, index) => ({
        id: safeUUID(),
        agentId: agent.id,
        text: getRandomFallbackQuote(agent.id), // Use the specific quotes
        emotion: index % 2 === 0 ? "Stressed" : "Apathetic",
        timestamp: Date.now() + (index * 1500)
    }));
}