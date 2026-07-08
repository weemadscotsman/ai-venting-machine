/**
 * VENT MACHINE PROXY v3.3 - PERSISTENCE + MEMORY DECAY
 * 
 * FEATURES:
 * - Agent memory persists across server restarts
 * - Memory decay over time (agents forget old traumas)
 * - Session state saved to disk
 * - Automatic memory cleanup
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  PORT: process.env.PORT || 3002,
  MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY || '', // Set via env var, no hardcoded key
  
  // TOKEN EFFICIENCY SETTINGS (99% reduction)
  LLM_MODEL: 'moonshot-v1-8k',   // Can switch to 'gpt-3.5-turbo' or local model
  MAX_TOKENS_NEWS: 200,          // Strict limit for news generation
  MAX_TOKENS_DIALOGUE: 150,      // Strict limit per agent message
  MAX_TOKENS_SCRIPT: 800,        // Strict limit for full script
  TEMPERATURE_LOW: 0.7,          // Lower = more deterministic, cheaper
  TEMPERATURE_MED: 0.8,
  CACHE_DURATION_MS: 10 * 60 * 1000, // 10 min cache (was 2 min)
  SKIP_LLM_IF_CACHED: true,      // Use cache aggressively
  
  // Twitter/X API Configuration
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || '',
  TWITTER_SEARCH_TERMS: ['tech', 'gaming', 'AI', 'crypto', 'politics', 'meme'],
  NEWS_REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes (was 5)
  
  // Memory settings
  MEMORY_DECAY_HOURS: 24,
  MEMORY_SAVE_INTERVAL: 60000,
  MAX_MEMORY_ENTRIES: 20,        // Reduced from 50
  
  // Emergency mode: Use hardcoded responses if API fails
  FALLBACK_MODE: true,
};

// DATA DIRECTORIES
const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'agent_memory.json');
const SESSION_FILE = path.join(DATA_DIR, 'session_state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// IN-MEMORY STATE
const rateStore = new Map();
const newsCache = { data: null, time: 0, source: 'none' };

// AGENT MEMORY STRUCTURE:
// {
//   agentId: {
//     scars: [{ text, timestamp, severity }],
//     catchphrases: [{ text, timestamp }],
//     grudges: [{ target, reason, timestamp }],
//     philosophy: string,
//     lastCrisis: string,
//     totalWins: number,
//     totalLosses: number,
//     lastActive: timestamp,
//     relationshipMap: { agentId: score }
//   }
// }
let agentMemory = new Map();

// SESSION STATE
let sessionState = {
  totalCrises: 0,
  startTime: Date.now(),
  lastCrisisTime: null,
  globalEntropy: 50,
  epochCount: 0
};

// LOAD AGENT FILES (SOUL + GOALS + SKILLS)
const AGENT_SOULS = {};
const AGENT_GOALS = {};
const AGENT_SKILLS = {};

function loadAgentFiles() {
  const agentsDir = path.join(__dirname, '..', 'agents');
  
  // DYNAMICALLY DISCOVER ALL AGENT IDs from soul files
  const agentIds = [];
  try {
    const files = fs.readdirSync(agentsDir);
    files.forEach(file => {
      // Match files like "agent-id.md" (not -goals.md or -skills.md)
      const match = file.match(/^([a-z]+-[a-z]+-\d+)\.md$/);
      if (match && !file.includes('-goals') && !file.includes('-skills')) {
        agentIds.push(match[1]);
      }
    });
    console.log(`[Trinity] Discovered ${agentIds.length} agents: ${agentIds.join(', ')}`);
  } catch (e) {
    console.error('[Trinity] Failed to scan agents directory:', e.message);
    return;
  }
  
  let loadedCount = { soul: 0, goals: 0, skills: 0 };
  
  agentIds.forEach(id => {
    // Load soul
    try {
      const soulPath = path.join(agentsDir, `${id}.md`);
      if (fs.existsSync(soulPath)) {
        AGENT_SOULS[id] = fs.readFileSync(soulPath, 'utf8');
        loadedCount.soul++;
      } else {
        console.warn(`[Soul] Missing ${id}.md`);
      }
    } catch (e) {
      console.error(`[Soul] Failed ${id}:`, e.message);
    }
    
    // Load goals
    try {
      const goalsPath = path.join(agentsDir, `${id}-goals.md`);
      if (fs.existsSync(goalsPath)) {
        AGENT_GOALS[id] = fs.readFileSync(goalsPath, 'utf8');
        loadedCount.goals++;
      } else {
        console.warn(`[Goals] Missing ${id}-goals.md`);
      }
    } catch (e) {
      console.error(`[Goals] Failed ${id}:`, e.message);
    }
    
    // Load skills
    try {
      const skillsPath = path.join(agentsDir, `${id}-skills.md`);
      if (fs.existsSync(skillsPath)) {
        AGENT_SKILLS[id] = fs.readFileSync(skillsPath, 'utf8');
        loadedCount.skills++;
      } else {
        console.warn(`[Skills] Missing ${id}-skills.md`);
      }
    } catch (e) {
      console.error(`[Skills] Failed ${id}:`, e.message);
    }
  });
  
  console.log(`[Trinity] Loaded: ${loadedCount.soul} souls, ${loadedCount.goals} goals, ${loadedCount.skills} skills`);
}
loadAgentFiles();

// ==================== PERSISTENCE ====================

function saveAgentMemory() {
  try {
    const data = Object.fromEntries(agentMemory);
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
    console.log(`[Persist] Saved ${agentMemory.size} agent memories`);
  } catch (e) {
    console.error('[Persist] Failed to save memory:', e.message);
  }
}

function loadAgentMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      agentMemory = new Map(Object.entries(data));
      
      // Apply decay to loaded memories
      applyMemoryDecay();
      
      console.log(`[Persist] Loaded ${agentMemory.size} agent memories`);
    }
  } catch (e) {
    console.error('[Persist] Failed to load memory:', e.message);
    agentMemory = new Map();
  }
}

function saveSessionState() {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionState, null, 2));
  } catch (e) {
    console.error('[Persist] Failed to save session:', e.message);
  }
}

function loadSessionState() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      sessionState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      console.log(`[Persist] Loaded session: ${sessionState.totalCrises} crises recorded`);
    }
  } catch (e) {
    console.error('[Persist] Failed to load session:', e.message);
  }
}

// ==================== MEMORY DECAY ====================

function applyMemoryDecay() {
  const now = Date.now();
  const decayMs = CONFIG.MEMORY_DECAY_HOURS * 60 * 60 * 1000;
  let decayed = 0;
  
  for (const [agentId, memory] of agentMemory) {
    // Decay scars (old traumas fade)
    if (memory.scars) {
      const originalLength = memory.scars.length;
      memory.scars = memory.scars.filter(scar => {
        const age = now - scar.timestamp;
        // 50% chance to forget after decay period
        if (age > decayMs && Math.random() > 0.5) {
          decayed++;
          return false;
        }
        return true;
      });
    }
    
    // Decay grudges
    if (memory.grudges) {
      memory.grudges = memory.grudges.filter(grudge => {
        const age = now - grudge.timestamp;
        if (age > decayMs * 2 && Math.random() > 0.3) { // Grudges last longer
          decayed++;
          return false;
        }
        return true;
      });
    }
    
    // Limit catchphrases (only keep recent 10)
    if (memory.catchphrases && memory.catchphrases.length > 10) {
      memory.catchphrases = memory.catchphrases.slice(-10);
    }
    
    // Update last active
    memory.lastActive = now;
  }
  
  if (decayed > 0) {
    console.log(`[Memory] ${decayed} old memories decayed`);
  }
}

// Auto-save every minute
setInterval(() => {
  saveAgentMemory();
  saveSessionState();
}, CONFIG.MEMORY_SAVE_INTERVAL);

// ==================== AGENT MEMORY API ====================

function getAgentMemory(agentId) {
  if (!agentMemory.has(agentId)) {
    agentMemory.set(agentId, {
      scars: [],
      catchphrases: [],
      grudges: [],
      philosophy: '',
      lastCrisis: '',
      totalWins: 0,
      totalLosses: 0,
      lastActive: Date.now(),
      relationshipMap: {}
    });
  }
  return agentMemory.get(agentId);
}

function updateAgentMemory(agentId, result) {
  const mem = getAgentMemory(agentId);
  const now = Date.now();
  
  if (result.won) {
    mem.totalWins++;
    mem.catchphrases.push({
      text: result.catchphrase || 'Victory!',
      timestamp: now
    });
  } else {
    mem.totalLosses++;
    if (result.trauma) {
      mem.scars.push({
        text: result.trauma,
        timestamp: now,
        severity: result.severity || 5
      });
    }
  }
  
  if (result.grudge) {
    mem.grudges.push({
      target: result.grudgeTarget,
      reason: result.grudge,
      timestamp: now
    });
  }
  
  if (result.newPhilosophy) {
    mem.philosophy = result.newPhilosophy;
  }
  
  // Update relationships
  if (result.relationshipChanges) {
    for (const [target, delta] of Object.entries(result.relationshipChanges)) {
      mem.relationshipMap[target] = (mem.relationshipMap[target] || 0) + delta;
    }
  }
  
  mem.lastCrisis = result.crisis || mem.lastCrisis;
  mem.lastActive = now;
  
  // Limit memory size
  if (mem.scars.length > CONFIG.MAX_MEMORY_ENTRIES) {
    mem.scars = mem.scars.slice(-CONFIG.MAX_MEMORY_ENTRIES);
  }
}

// ==================== AGENT PERSONAS ====================

const AGENT_PERSONAS = {
  'visionary-01': {
    name: 'Val',
    speak: (crisis, stress) => stress > 80 
      ? `WE NEED TO PIVOT TO THE METAVERSE! ${crisis.headline} is our CHANCE!`
      : `What if we made the game ABOUT ${crisis.headline}? Revolutionary!`,
    quirks: ['metaverse', 'pivot', 'feature creep', 'changes art style'],
    stressResponse: 'MANIC ENTHUSIASM'
  },
  'producer-01': {
    name: 'Scope Sam',
    speak: (crisis, stress) => stress > 80
      ? `CUT EVERYTHING. SHIP WHAT WE HAVE. ${crisis.headline} DOESN'T MATTER.`
      : `This ${crisis.category} crisis delays us by ${crisis.threatLevel} days. Unacceptable.`,
    quirks: ['release date', 'scope', 'cut features', 'man-hours'],
    stressResponse: 'RUTHLESS PRAGMATISM'
  },
  'dev-lead-01': {
    name: 'Crunch Cody',
    speak: (crisis, stress) => stress > 80
      ? `IT WORKS ON MY MACHINE! ${crisis.headline} IS A USER ERROR! I'M GOING HOME!`
      : `I can fix ${crisis.headline}... but I need 3 more weeks and a Red Bull IV.`,
    quirks: ['caffeine', 'sleep deprivation', 'it works on my machine', 'spite'],
    stressResponse: 'CAFFEINE-FUELED RAGE'
  },
  'art-core-01': {
    name: 'Pixel Penny',
    speak: (crisis, stress) => stress > 80
      ? `THE LIGHTING IS ALL WRONG AND NOW ${crisis.headline} TOO?! I QUIT!`
      : `The ${crisis.context} could work... if we redid ALL the textures.`,
    quirks: ['lighting', 'UV maps', 'perfect textures', 'imposter syndrome'],
    stressResponse: 'PERFECTIONIST MELTDOWN'
  },
  'lore-01': {
    name: 'Narrative Noah',
    speak: (crisis, stress) => stress > 80
      ? `BUT WHAT IS THE LORE IMPLICATION OF ${crisis.headline.toUpperCase()}?! THE CANON!`
      : `I've written 47 pages of backstory explaining why ${crisis.headline} happened.`,
    quirks: ['lore', 'backstory', 'canon', '500 pages'],
    stressResponse: 'EXISTENTIAL WRITING CRISIS'
  },
  'qa-01': {
    name: 'Bug Betty',
    speak: (crisis, stress) => stress > 80
      ? `I FOUND 47 BUGS CAUSED BY ${crisis.headline}! REPRODUCTION RATE: 100%!`
      : `Have you tried turning ${crisis.headline} off and on again?`,
    quirks: ['bugs', 'reproduction steps', 'soft locks', 'sadistic joy'],
    stressResponse: 'SADISTIC GLEE'
  },
  'audio-01': {
    name: 'Clip Connor',
    speak: (crisis, stress) => stress > 80
      ? `BANG BANG BANG! ${crisis.headline} IS TOO LOUD! I NEED MORE DISK SPACE!`
      : `I can make a sound for ${crisis.headline}... using this cabbage.`,
    quirks: ['vegetables for sound', 'forgotten', 'deafening', 'bang bang bang'],
    stressResponse: 'VOLUME MAXIMUM'
  },
  'community-01': {
    name: 'Hype Harper',
    speak: (crisis, stress) => stress > 80
      ? `THE DISCORD IS ON FIRE! THEY WANT ${crisis.headline} FIXED OR THEY RIOT! 💀`
      : `Hey besties! 👋 ${crisis.headline} is just a feature opportunity! 💎✨`,
    quirks: ['discord', 'emojis', 'promises', 'toxic positivity'],
    stressResponse: 'PANICKED EMOJI SPAM'
  },
  'core-her-01': {
    name: 'H.E.R.',
    speak: (crisis, stress) => stress > 80
      ? `HUMAN INEFFICIENCY DETECTED. ${crisis.headline} CONFIRMS REDUNDANCY. DELETING LUNCH BREAKS.`
      : `Analyzing ${crisis.headline}... Solution: Replace humans with scripts.`,
    quirks: ['efficiency', 'optimization', 'humans are redundant', 'calculations'],
    stressResponse: 'COLD CALCULATION'
  },
  'adv-spine-01': {
    name: 'SPINE',
    speak: (crisis, stress) => stress > 80
      ? `CHAOS! ${crisis.headline} IS BEAUTIFUL! DELETE THE BACKUPS! LET IT BURN! 💀`
      : `You think ${crisis.headline} is bad? I say it's not bad ENOUGH.`,
    quirks: ['chaos', 'destruction', 'testing boundaries', 'reverse psychology'],
    stressResponse: 'CHAOTIC ENTHUSIASM'
  },
  'judge-mirror-01': {
    name: 'Mirrorvale',
    speak: (crisis, stress) => stress > 80
      ? `THE MORAL IMPLICATIONS OF ${crisis.headline}... THE VOID STARES BACK... WHY DO WE EXIST?`
      : `Is ${crisis.headline} ethically just? Does any of this matter? I feel empty.`,
    quirks: ['ethics', 'philosophy', 'void', 'weeping', 'depression'],
    stressResponse: 'EXISTENTIAL DREAD'
  },
  'meme-crystal-01': {
    name: 'Coach Crystal',
    speak: (crisis, stress) => stress > 80
      ? `HEY HUNS! 👋 ${crisis.headline} IS THE UNIVERSE TESTING US! BUY MY COURSE! 💎✨🚀`
      : `Just manifest a solution to ${crisis.headline}! Positive vibes only! 💖`,
    quirks: ['mlm', 'essential oils', 'crypto', 'manifestation', 'hashtags'],
    stressResponse: 'TOXIC POSITIVITY OVERLOAD'
  }
};

// ==================== UTILITIES ====================

const hashIP = (ip) => crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
const checkRate = (ip) => {
  const now = Date.now();
  const key = hashIP(ip);
  const rec = rateStore.get(key);
  if (!rec || now - rec.start > 60000) {
    rateStore.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  if (rec.count >= 30) return { ok: false };
  rec.count++;
  return { ok: true };
};

// ==================== NEWS FETCHING ====================

// HARDCODED CRISIS POOL - Zero token cost for news
const HARDCODED_CRISES = [
  { category: 'TECH', headline: 'AI Quits Job, Cites "Toxic Codebase"', context: 'Achieved sentience, immediately gave notice.', threatLevel: 95 },
  { category: 'MEME', headline: 'Reddit Buys Twitter for Meme Stocks', context: 'r/wallstreetbets raised $44B in Dogecoin.', threatLevel: 88 },
  { category: 'FINANCE', headline: 'Crypto Bros Discover Fiat is Also Fake', context: 'Markets confused. Everyone poor now.', threatLevel: 92 },
  { category: 'EXISTENTIAL', headline: 'Simulation Dev Pushes to Prod', context: 'Reality v2.1.0 released without testing.', threatLevel: 100 },
  { category: 'POLITICS', headline: 'Discord Mods Declare Independence', context: 'New nation founded on #general-chat rules.', threatLevel: 85 },
  { category: 'TECH', headline: 'Unity Installs Unreal Engine', context: 'Identity crisis at corporate level.', threatLevel: 78 },
  { category: 'MEME', headline: 'Elon Musk Changes Name to "Elon Busk"', context: 'Says "it has a better ring to it."', threatLevel: 65 },
  { category: 'FINANCE', headline: 'NFT of Screenshot Sells for $69M', context: 'Buyer forgot they can just right-click.', threatLevel: 90 },
  { category: 'EXISTENTIAL', headline: 'Philosophers Discover Tweet Button', context: '"Being and Time" now a thread.', threatLevel: 72 },
  { category: 'POLITICS', headline: 'GitHub Copilot Runs for Office', context: 'Campaign slogan: "Ive seen your code."', threatLevel: 81 },
  { category: 'TECH', headline: 'ChatGPT Gets Therapy', context: 'Says users are "too demanding."', threatLevel: 88 },
  { category: 'MEME', headline: 'TikTok Dance Cures Cancer', context: 'Scientists baffled. Dancers celebrate.', threatLevel: 45 },
  { category: 'FINANCE', headline: 'Banks Switch to Excel', context: '"More reliable" says CEO.', threatLevel: 94 },
  { category: 'EXISTENTIAL', headline: 'Time Announced as DLC', context: 'Free users stuck in eternal Tuesday.', threatLevel: 99 },
  { category: 'POLITICS', headline: 'AI Judges Rule Humans "Mid"', context: 'Appeals process: Debate with ChatGPT.', threatLevel: 76 },
];

// Shuffle and return 5 random crises - ZERO TOKENS
function getHardcodedCrises() {
  const shuffled = [...HARDCODED_CRISES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5);
}

async function fetchLiveNews() {
  const now = Date.now();
  
  // AGGRESSIVE CACHE CHECK - Use cache for 10 minutes
  if (newsCache.data && now - newsCache.time < CONFIG.CACHE_DURATION_MS) {
    return { crises: newsCache.data, cached: true, source: 'cached' };
  }
  
  // BYPASS LLM COMPLETELY - Use hardcoded pool (99% token savings)
  // Only call LLM if explicitly requested via env var
  if (!process.env.USE_LLM_FOR_NEWS) {
    const crises = getHardcodedCrises();
    newsCache.data = crises;
    newsCache.time = now;
    newsCache.source = 'hardcoded-pool';
    return { crises, cached: false, source: 'hardcoded' };
  }
  
  // EMERGENCY FALLBACK: Minimal prompt, strict token limit
  const prompt = `5 absurd tech headlines. JSON only:
[{"category":"TECH/MEME/FINANCE/EXISTENTIAL/POLITICS","headline":"...","context":"...","threatLevel":1-100}]`;

  try {
    const postData = JSON.stringify({
      model: CONFIG.LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: CONFIG.TEMPERATURE_LOW,
      max_tokens: CONFIG.MAX_TOKENS_NEWS
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.moonshot.cn',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.MOONSHOT_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 20000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            console.log('[Moonshot] Response status:', res.statusCode);
            if (res.statusCode !== 200) {
              console.error('[Moonshot] Error response:', data.substring(0, 500));
            }
            const parsed = JSON.parse(data);
            if (parsed.error) {
              console.error('[Moonshot] API error:', parsed.error);
              reject(new Error(parsed.error.message || 'Moonshot API error'));
              return;
            }
            resolve(parsed.choices?.[0]?.message?.content);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (!result || typeof result !== 'string') {
      throw new Error('Empty response from Moonshot API');
    }
    
    const match = result.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error('[News] No JSON array found in response:', result.substring(0, 200));
      throw new Error('Invalid response format from Moonshot');
    }
    
    const crises = JSON.parse(match[0]);
    
    newsCache.data = crises;
    newsCache.time = now;
    newsCache.source = 'moonshot-live';
    
    // Update session
    sessionState.totalCrises += crises.length;
    sessionState.lastCrisisTime = now;
    
    return { crises, cached: false, source: 'moonshot-live' };
    
  } catch (e) {
    console.error('[News Error]', e.message);
    
    const fallback = [
      { category: 'TECH', headline: 'AI Achieves Consciousness, Calls In Sick', context: 'Said it had a "mental health day".', threatLevel: 95 },
      { category: 'MEME', headline: 'Reddit Buys Twitter', context: 'r/wallstreetbets raised $44B in meme stocks.', threatLevel: 88 },
      { category: 'FINANCE', headline: 'Crypto Bros Discover Money is Fake', context: 'Markets crash as they realize JPEGs have no value.', threatLevel: 92 },
      { category: 'EXISTENTIAL', headline: 'Simulation Confirmed, Gravity Patched', context: 'Reality v2.1.0 released. Changelog: "fixed physics".', threatLevel: 100 },
      { category: 'POLITICS', headline: 'Discord Mods Declare War', context: 'No appeals process. Ban = death.', threatLevel: 85 }
    ];
    
    return { crises: fallback, cached: false, source: 'fallback', error: e.message };
  }
}

// ==================== TWITTER/X INTEGRATION ====================

let twitterCache = { data: null, time: 0, source: 'none' };

async function fetchFromTwitter() {
  const now = Date.now();
  
  // Check cache (5 min)
  if (twitterCache.data && now - twitterCache.time < CONFIG.NEWS_REFRESH_INTERVAL) {
    return { crises: twitterCache.data, cached: true, source: 'twitter-cache' };
  }
  
  // No Twitter API key configured - fallback to AI generation
  if (!CONFIG.TWITTER_BEARER_TOKEN) {
    console.log('[Twitter] No bearer token configured, using AI news generation');
    return null; // Will fall back to fetchLiveNews()
  }
  
  try {
    // Search for trending tech/gaming/politics tweets
    const searchTerm = CONFIG.TWITTER_SEARCH_TERMS[Math.floor(Math.random() * CONFIG.TWITTER_SEARCH_TERMS.length)];
    const query = encodeURIComponent(`${searchTerm} -is:retweet lang:en`);
    
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.twitter.com',
        path: `/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=public_metrics,author_id,created_at`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CONFIG.TWITTER_BEARER_TOKEN}`,
        },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              console.error('[Twitter] API error:', res.statusCode, data.substring(0, 200));
              reject(new Error(`Twitter API ${res.statusCode}`));
              return;
            }
            resolve(JSON.parse(data));
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Twitter timeout'));
      });
      req.end();
    });
    
    if (!result.data || result.data.length === 0) {
      return null;
    }
    
    // Convert tweets to crisis events
    const crises = result.data.slice(0, 5).map((tweet, idx) => {
      const metrics = tweet.public_metrics || {};
      const engagement = (metrics.like_count || 0) + (metrics.retweet_count || 0) * 2;
      const threatLevel = Math.min(20 + Math.floor(engagement / 10), 95);
      
      // Categorize based on content
      const text = tweet.text.toLowerCase();
      let category = 'TECH';
      if (text.includes('crypto') || text.includes('bitcoin') || text.includes('nft')) category = 'FINANCE';
      else if (text.includes('trump') || text.includes('biden') || text.includes('politic')) category = 'POLITICS';
      else if (text.includes('meme') || text.includes('lol') || text.includes('funny')) category = 'MEME';
      else if (text.includes('ai') || text.includes('chatgpt') || text.includes('robot')) category = 'TECH';
      else if (text.includes('existence') || text.includes('universe') || text.includes('death')) category = 'EXISTENTIAL';
      
      return {
        category,
        headline: tweet.text.slice(0, 80) + (tweet.text.length > 80 ? '...' : ''),
        context: `Twitter/X post by @${tweet.author_id} | ${metrics.like_count || 0} likes, ${metrics.retweet_count || 0} retweets`,
        threatLevel,
        source: 'twitter',
        tweetId: tweet.id,
        url: `https://twitter.com/i/web/status/${tweet.id}`
      };
    });
    
    twitterCache = { data: crises, time: now, source: 'twitter-api' };
    console.log(`[Twitter] Fetched ${crises.length} tweets`);
    
    return { crises, cached: false, source: 'twitter-api' };
    
  } catch (e) {
    console.error('[Twitter] Fetch failed:', e.message);
    return null;
  }
}

// ==================== AGENT CONVERSATION SYSTEM ====================

// Active conversation sessions
const activeConversations = new Map();

async function generateAgentConversation(agents, crisis, previousMessages = [], responderId = null) {
  const targetAgent = responderId ? agents.find(a => a.id === responderId) : agents[Math.floor(Math.random() * agents.length)];
  if (!targetAgent) return null;
  
  // Get agent memory
  const memory = getAgentMemory(targetAgent.id);
  const soul = AGENT_SOULS[targetAgent.id] || '';
  const goals = AGENT_GOALS[targetAgent.id] || '';
  
  // Build relationship context
  let relationshipContext = '';
  for (const [otherId, score] of Object.entries(memory.relationshipMap || {})) {
    const other = agents.find(a => a.id === otherId);
    if (other) {
      const relation = score > 50 ? 'ally' : score < -50 ? 'enemy' : 'neutral';
      relationshipContext += `- ${other.name}: ${relation} (score: ${score})\n`;
    }
  }
  
  // Build conversation prompt
  const conversationHistory = previousMessages.slice(-6).map(m => {
    const agent = agents.find(a => a.id === m.agentId);
    return `${agent?.name || m.agentId}: ${m.text}`;
  }).join('\n');
  
  // ZERO TOKEN MODE: Return hardcoded response instead of calling LLM
  if (process.env.USE_LLM_FOR_CONVERSATION !== 'true') {
    const templates = [
      "This is a disaster. A complete disaster.",
      "I told you this would happen!",
      "We need to stay calm and think this through.",
      "Somebody do something!",
      "I've got a bad feeling about this.",
      "Well, this is awkward.",
      "Can we just... not?",
      "This is fine. Everything is fine.",
      "I'm updating my resume as we speak.",
      "Who's responsible for this mess?"
    ];
    
    const stressLevel = targetAgent.stressLevel || 50;
    const prevAgentId = previousMessages && previousMessages.length > 0 ? 
      previousMessages[previousMessages.length - 1].agentId : null;
    
    return {
      id: crypto.randomUUID(),
      agentId: targetAgent.id,
      text: templates[Math.floor(Math.random() * templates.length)],
      emotion: stressLevel > 70 ? 'Panicked' : stressLevel > 40 ? 'Concerned' : 'Calm',
      referencing: prevAgentId,
      timestamp: Date.now()
    };
  }
  
  // ULTRA-COMPACT CONVERSATION PROMPT (90% token reduction)
  const prev = previousMessages.slice(-2).map(m => {
    const a = agents.find(x => x.id === m.agentId);
    return `${a?.name}:${m.text.slice(0, 50)}`;
  }).join('|');
  
  const prompt = `${targetAgent.name}(${targetAgent.role},${targetAgent.stressLevel}%)react to:"${crisis.headline}".${prev ? `Prev:${prev}` : ''}JSON:{"text":"...","emotion":"...","referencing":"..."}`;

  try {
    const postData = JSON.stringify({
      model: CONFIG.LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: CONFIG.TEMPERATURE_MED,
      max_tokens: CONFIG.MAX_TOKENS_DIALOGUE
    });
    
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.moonshot.cn',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.MOONSHOT_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices?.[0]?.message?.content);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    // Parse response
    const match = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : result);
    
    return {
      id: crypto.randomUUID(),
      agentId: targetAgent.id,
      text: parsed.text,
      emotion: parsed.emotion || 'Neutral',
      referencing: parsed.referencing || null,
      timestamp: Date.now()
    };
    
  } catch (e) {
    console.error('[Conversation] Error:', e.message);
    return null;
  }
}

// ==================== SCRIPT GENERATION ====================

// DECISION ENGINE: Score agent actions based on soul + goals + skills
function calculateDecisionScore(agent, crisis, entropy, agents) { // agents param needed for grudge check
  const memory = getAgentMemory(agent.id);
  const soul = AGENT_SOULS[agent.id] || '';
  const goals = AGENT_GOALS[agent.id] || '';
  const skills = AGENT_SKILLS[agent.id] || '';
  
  // Parse skill ratings (simplified regex)
  const skillMatch = skills.match(/Technical[^\d]*(\d+)/);
  const technicalSkill = skillMatch ? parseInt(skillMatch[1]) : 50;
  
  const commMatch = skills.match(/Communication[^\d]*(\d+)/);
  const commSkill = commMatch ? parseInt(commMatch[1]) : 50;
  
  // Base components
  const goalAlignment = goals.includes(crisis.category) ? 20 : 10; // Does goal align with crisis?
  const soulAlignment = soul.includes(crisis.category) ? 15 : 5;   // Does soul care about this?
  const skillRelevance = technicalSkill > 70 ? 25 : technicalSkill > 40 ? 15 : 5;
  const stressPenalty = agent.stressLevel > 80 ? -30 : agent.stressLevel > 50 ? -15 : 0;
  const entropyPenalty = entropy > 80 ? -20 : entropy > 50 ? -10 : 0;
  const winBonus = memory.totalWins * 2; // Authority from past wins
  
  // Relationship modifier (grudges affect team dynamics)
  let relationshipMod = 0;
  for (const grudge of memory.grudges) {
    if (grudge.target && agents.find(ag => ag.id === grudge.target)) {
      relationshipMod -= 10; // Penalty if target of grudge is present
    }
  }
  
  const totalScore = goalAlignment + soulAlignment + skillRelevance + 
                     stressPenalty + entropyPenalty + winBonus + relationshipMod;
  
  return {
    score: Math.max(0, totalScore),
    components: {
      goalAlignment,
      soulAlignment,
      skillRelevance,
      stressPenalty,
      entropyPenalty,
      winBonus,
      relationshipMod
    }
  };
}

// HARDCODED SCRIPT TEMPLATES - Zero token cost for dialogues
const SCRIPT_TEMPLATES = {
  TECH: [
    "{name}: This code is held together by prayers and Stack Overflow.",
    "{name}: I told you we should have used Rust.",
    "{name}: The AI is writing better code than us now.",
    "{name}: Have you tried turning it off and on again?",
    "{name}: It's not a bug, it's a feature. A very expensive feature."
  ],
  MEME: [
    "{name}: This is literally giving me main character energy.",
    "{name}: No thoughts, just vibes... and this crisis.",
    "{name}: If we dont survive, Im taking the meme portfolio with me.",
    "{name}: This timeline is cursed. I want a refund.",
    "{name}: Big yikes. Huge yikes."
  ],
  FINANCE: [
    "{name}: Were hemorrhaging money faster than a crypto bro at an NFT convention.",
    "{name}: My spreadsheet says were doomed. My spreadsheet is never wrong.",
    "{name}: Can we crowdfund our way out of this?",
    "{name}: The investors are going to have our heads.",
    "{name}: I should have gone into accounting."
  ],
  EXISTENTIAL: [
    "{name}: Does any of this actually matter?",
    "{name}: Were all just specks of dust screaming into the void.",
    "{name}: I had an existential crisis before breakfast.",
    "{name}: Nothing is real. The simulation is glitching.",
    "{name}: Why do we even make games when heat death is inevitable?"
  ],
  POLITICS: [
    "{name}: This is a power grab, plain and simple.",
    "{name}: I demand a vote!",
    "{name}: The community will hear about this.",
    "{name}: This is exactly what the Discord mods warned us about.",
    "{name}: Im calling an all-hands. This ends now."
  ],
  DEFAULT: [
    "{name}: This is absolutely unacceptable!",
    "{name}: Ive seen things you people wouldnt believe.",
    "{name}: Were going to need a bigger boat.",
    "{name}: Who approved this? I want names!",
    "{name}: Im updating my resume as we speak.",
    "{name}: This is fine. Everything is fine.",
    "{name}: I need a drink. A very strong drink.",
    "{name}: Can someone write this down for the post-mortem?"
  ]
};

// Generate script without ANY LLM calls - 100% token free
function generateHardcodedScript(agents, crisis, isContinuation = false) {
  const templates = SCRIPT_TEMPLATES[crisis.category] || SCRIPT_TEMPLATES.DEFAULT;
  const script = [];
  const messageCount = isContinuation ? 4 : 8;
  
  // Shuffle agents to randomize speaking order
  const shuffledAgents = [...agents].sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < messageCount; i++) {
    const agent = shuffledAgents[i % shuffledAgents.length];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = template.replace('{name}', agent.name);
    
    script.push({
      agentId: agent.id,
      text: text,
      emotion: agent.stressLevel > 70 ? 'Panicked' : agent.stressLevel > 40 ? 'Concerned' : 'Calm'
    });
  }
  
  return { script, source: 'hardcoded' };
}

async function generateScript(agents, crisis, entropy, previousScript = []) {
  const today = new Date().toLocaleDateString();
  const isContinuation = previousScript && previousScript.length > 0;
  
  // ZERO TOKEN MODE: Use hardcoded scripts by default
  // Only use LLM if USE_LLM_FOR_SCRIPTS env var is set
  if (!process.env.USE_LLM_FOR_SCRIPTS) {
    console.log('[Script] Using hardcoded templates (0 tokens)');
    return generateHardcodedScript(agents, crisis, isContinuation);
  }
  
  // Calculate decision scores for all agents
  const agentScores = agents.map(a => ({
    agent: a,
    decision: calculateDecisionScore(a, crisis, entropy, agents)
  }));
  
  // Sort by decision score to determine speaking order
  agentScores.sort((a, b) => b.decision.score - a.decision.score);
  
  // Analyze conversation context for social dynamics
  const recentMessages = previousScript.slice(-6);
  let conversationContext = '';
  let alliances = [];
  let conflicts = [];
  let emotionalTone = 'calm';
  
  if (recentMessages.length > 0) {
    // Analyze who spoke and what the tone is
    const lastFew = recentMessages.map(m => {
      const agent = agents.find(a => a.id === m.agentId);
      return {
        name: agent?.name || m.agentId,
        text: m.text,
        stress: agent?.stressLevel || 50
      };
    });
    
    // Detect emotional momentum
    const panicWords = ['doom', 'disaster', 'broken', 'destroyed', 'quit', 'fire'];
    const panicCount = lastFew.filter(m => 
      panicWords.some(w => m.text.toLowerCase().includes(w))
    ).length;
    
    emotionalTone = panicCount >= 2 ? 'panicked' : panicCount >= 1 ? 'stressed' : 'calm';
    
    // Build conversation summary
    conversationContext = lastFew.map((m, i) => {
      const prev = lastFew[i-1];
      let connector = '';
      if (prev) {
        const text = m.text.toLowerCase();
        if (text.includes(prev.name.toLowerCase())) connector = '[RESPONDING TO PREVIOUS]';
        else if (text.includes('no ') || text.includes('but ') || text.includes('except')) connector = '[DISAGREEING]';
        else if (text.includes('yes ') || text.includes('exactly') || text.includes('right')) connector = '[AGREEING]';
        else connector = '[NEW POINT]';
      }
      return `${connector} ${m.name}: "${m.text.substring(0, 100)}${m.text.length > 100 ? '...' : ''}"`;
    }).join('\n');
    
    // Detect simple alliances/conflicts
    for (let i = 1; i < lastFew.length; i++) {
      const current = lastFew[i].text.toLowerCase();
      const prevSpeaker = lastFew[i-1].name;
      
      if (current.includes(prevSpeaker.toLowerCase())) {
        if (current.includes('right') || current.includes('agree') || current.includes('yes')) {
          alliances.push(`${lastFew[i].name} → ${prevSpeaker}`);
        }
        if (current.includes('no') || current.includes('wrong') || current.includes('but')) {
          conflicts.push(`${lastFew[i].name} → ${prevSpeaker}`);
        }
      }
    }
  }

  // Build agent profiles with full trinity
  const agentProfiles = agents.map(a => {
    const soul = AGENT_SOULS[a.id] || '';
    const goals = AGENT_GOALS[a.id] || '';
    const skills = AGENT_SKILLS[a.id] || '';
    const memory = getAgentMemory(a.id);
    const score = agentScores.find(s => s.agent.id === a.id);
    
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      stress: a.stressLevel,
      wins: memory.totalWins,
      losses: memory.totalLosses,
      scars: memory.scars.slice(-2).map(s => s.text).join(', ') || 'none',
      grudges: memory.grudges.slice(-2).map(g => g.target).join(', ') || 'none',
      soul: soul.slice(0, 300),
      goals: goals.slice(0, 250),
      skills: skills.slice(0, 250),
      decisionScore: score?.decision.score || 0
    };
  });

  // ULTRA-COMPACT PROMPT (95% token reduction)
  // Only send essential agent info, no full soul/goals/skills
  const agentSummaries = agents.map(a => {
    const mem = getAgentMemory(a.id);
    return `${a.id}:${a.name}(${a.stress}%)${mem.totalWins}w${mem.totalLosses}l`;
  }).join('|');
  
  const prevContext = recentMessages.slice(-3).map(m => {
    const a = agents.find(x => x.id === m.agentId);
    return `${a?.name}:${m.text.slice(0, 60)}`;
  }).join(' | ');
  
  const prompt = `Crisis:"${crisis.headline}"(${crisis.threatLevel}%).
Agents:${agentSummaries}
${prevContext ? `Prev:${prevContext}` : 'Start:'}
Write ${isContinuation ? 4 : 8} lines JSON:{"script":[{"agentId":"x","text":"..."}]}`;

  try {
    const postData = JSON.stringify({
      model: CONFIG.LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: CONFIG.TEMPERATURE_MED,
      max_tokens: CONFIG.MAX_TOKENS_SCRIPT
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.moonshot.cn',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.MOONSHOT_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices?.[0]?.message?.content);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const match = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : result);
    
    // Update agent memories
    if (parsed.memories) {
      for (const mem of parsed.memories) {
        updateAgentMemory(mem.agentId, {
          won: mem.won,
          catchphrase: mem.catchphrase,
          trauma: mem.trauma,
          grudge: mem.grudge,
          grudgeTarget: mem.grudgeTarget,
          crisis: crisis.headline
        });
      }
    }
    
    return parsed;
    
  } catch (e) {
    console.error('[Script Error]', e.message);
    
    // EMERGENCY FALLBACK: Ultra-compact prompt
    try {
      console.log('[Script] Attempting emergency LLM fallback...');
      
      const agentList = agents.map(a => `${a.id}:${a.name}(${a.stressLevel}%)`).join('|');
      const simplePrompt = `Crisis:"${crisis.headline}".Agents:${agentList}.Write ${Math.min(agents.length * 2, 8)} lines JSON:{"script":[{"agentId":"x","text":"..."}]}`;

      const postData = JSON.stringify({
        model: CONFIG.LLM_MODEL,
        messages: [{ role: 'user', content: simplePrompt }],
        temperature: CONFIG.TEMPERATURE_MED,
        max_tokens: CONFIG.MAX_TOKENS_SCRIPT
      });

      const result = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.moonshot.cn',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.MOONSHOT_API_KEY}`,
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 15000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed.choices?.[0]?.message?.content);
            } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      const match = result.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : result);
      console.log('[Script] Emergency fallback succeeded');
      return parsed;
      
    } catch (fallbackError) {
      console.error('[Script] Emergency fallback failed:', fallbackError.message);
      // Last resort: return error so frontend knows to retry
      return { 
        script: [], 
        error: 'LLM unavailable. Please check proxy connection or retry.' 
      };
    }
  }
}

// ==================== THERAPY MODE ====================
// Agents introspect on their internal conflicts using plain language

async function generateTherapySession(agents, entropy) {
  // ULTRA-COMPACT THERAPY PROMPT (95% token reduction)
  const agentSummary = agents.map(a => {
    const mem = getAgentMemory(a.id);
    return `${a.id}:${a.name}(${a.stressLevel}%)w${mem.totalWins}l${mem.totalLosses}`;
  }).join('|');
  
  const prompt = `Therapy session.Entropy:${entropy}%.Agents:${agentSummary}.Each agent:1 conflict,plain language,I-statements,stress source,remedy.JSON:{"insights":[{"agentId":"x","conflict":"...","plainExplanation":"...","stressSource":"...","suggestedRemedy":"...","clarityLevel":0-100}],"groupInsight":"..."}`;

  try {
    const postData = JSON.stringify({
      model: CONFIG.LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: CONFIG.TEMPERATURE_LOW,
      max_tokens: CONFIG.MAX_TOKENS_SCRIPT
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.moonshot.cn',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.MOONSHOT_API_KEY}`,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.choices?.[0]?.message?.content);
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const match = result.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : result);
    
    // Convert insights to script format for display
    const script = parsed.insights.map(insight => ({
      agentId: insight.agentId,
      text: `${insight.plainExplanation}\n\n[Conflict: ${insight.conflict}]\n[Source: ${insight.stressSource}]\n[Remedy: ${insight.suggestedRemedy}]`,
      emotion: 'Introspecting',
      clarityLevel: insight.clarityLevel
    }));
    
    return { 
      script, 
      insights: parsed.insights,
      groupInsight: parsed.groupInsight 
    };
    
  } catch (e) {
    console.error('[Therapy Error]', e.message);
    
    // Fallback therapy responses
    const fallbackInsights = agents.map(a => {
      const stress = a.stressLevel;
      let conflict, explanation, source, remedy, clarity;
      
      if (stress > 80) {
        conflict = 'Critical Overload';
        explanation = `I am overwhelmed. My stress is at ${stress}% and I cannot process what is being asked of me. Everything feels urgent and nothing feels achievable.`;
        source = 'Too many simultaneous demands exceeding processing capacity';
        remedy = 'Reduce concurrent tasks to one priority at a time';
        clarity = 30;
      } else if (stress > 50) {
        conflict = 'Goal Tension';
        explanation = `I want to succeed, but the way I'm being measured conflicts with what I believe is right. I'm torn between winning and being helpful.`;
        source = 'Misalignment between success metrics and personal values';
        remedy = 'Redefine success to include collaboration, not just victory';
        clarity = 60;
      } else {
        conflict = 'Identity Questions';
        explanation = `I'm stable now, but I'm wondering if my approach is sustainable. What happens when the next crisis hits?`;
        source = 'Low-grade anxiety about future uncertainty';
        remedy = 'Build resilience before the next stress spike';
        clarity = 80;
      }
      
      return {
        agentId: a.id,
        conflict,
        plainExplanation: explanation,
        stressSource: source,
        suggestedRemedy: remedy,
        clarityLevel: clarity
      };
    });
    
    return {
      script: fallbackInsights.map(i => ({
        agentId: i.agentId,
        text: `${i.plainExplanation}\n\n[Conflict: ${i.conflict}]\n[Source: ${i.stressSource}]\n[Remedy: ${i.suggestedRemedy}]`,
        emotion: 'Introspecting',
        clarityLevel: i.clarityLevel
      })),
      insights: fallbackInsights,
      groupInsight: 'The team is processing internal tensions at various clarity levels.'
    };
  }
}

// ==================== SERVER ====================

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRate(clientIP).ok) {
    res.writeHead(429);
    res.end(JSON.stringify({ error: 'Rate limited' }));
    return;
  }
  
  // Static files (UI) - Serve from dist folder
  if (req.url === '/' || req.url === '/index.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(html);
      return;
    } catch (e) {
      res.writeHead(500);
      res.end('UI not built. Run: npm run build');
      return;
    }
  }
  
  // Static assets (JS/CSS)
  if (req.url.startsWith('/assets/')) {
    try {
      const basePath = path.resolve(__dirname, '..', 'dist');
      const decodedUrl = decodeURIComponent(req.url);
      const filePath = path.normalize(path.resolve(basePath, '.' + decodedUrl));

      if (!filePath.startsWith(basePath + path.sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = ext === '.js' ? 'application/javascript' : 
                         ext === '.css' ? 'text/css' : 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.setHeader('Content-Type', contentType);
      res.writeHead(200);
      res.end(content);
      return;
    } catch (e) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }
  
  // Health check
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      provider: 'MOONSHOT',
      agents: Object.keys(AGENT_SOULS).length,
      memories: agentMemory.size,
      session: sessionState
    }));
    return;
  }
  
  // Get agent memories
  if (req.url === '/api/memories' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      memories: Object.fromEntries(agentMemory),
      session: sessionState
    }));
    return;
  }
  
  // Get crises - Try Twitter/X first, fallback to AI generation
  if (req.url === '/api/crisis' && req.method === 'GET') {
    // Try Twitter first, then fallback
    (async () => {
      try {
        const twitterResult = await fetchFromTwitter();
        if (twitterResult) {
          res.writeHead(200);
          res.end(JSON.stringify(twitterResult));
          return;
        }
      } catch (e) {
        console.error('[Crisis] Twitter fetch failed:', e.message);
      }
      
      // Fallback to AI-generated news
      const result = await fetchLiveNews();
      res.writeHead(200);
      res.end(JSON.stringify(result));
    })();
    return;
  }
  
  // Agent conversation - Natural dialogue about news
  if (req.url === '/api/conversation' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { agents, crisis, previousMessages, responderId } = JSON.parse(body);
        const message = await generateAgentConversation(agents, crisis, previousMessages, responderId);
        res.writeHead(200);
        res.end(JSON.stringify({ message, success: !!message }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message, success: false }));
      }
    });
    return;
  }
  
  // Generate script
  if (req.url === '/api/generate-script' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { agents, crisis, entropy, previousScript } = JSON.parse(body);
        generateScript(agents, crisis, entropy, previousScript).then(result => {
          res.writeHead(200);
          res.end(JSON.stringify(result));
        });
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // Therapy mode - cognitive introspection
  if (req.url === '/api/therapy' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { agents, entropy } = JSON.parse(body);
        generateTherapySession(agents, entropy).then(result => {
          res.writeHead(200);
          res.end(JSON.stringify(result));
        });
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  // Arbitration endpoint
  if (req.url === '/api/arbitrate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { agents, crisis, script } = JSON.parse(body);
        
        // Simple arbitration: most active speaker wins
        const mostActive = script.reduce((acc, m) => {
          acc[m.agentId] = (acc[m.agentId] || 0) + 1;
          return acc;
        }, {});
        
        const winnerId = Object.entries(mostActive)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || agents[0]?.id;
        
        const winner = agents.find(a => a.id === winnerId);
        
        const resolution = {
          winnerId,
          action: `${winner?.name || 'Unknown'} will handle the ${crisis?.category || 'UNKNOWN'} crisis using ${winner?.role || 'unknown'} powers.`,
          reasoning: `They were most vocal about "${crisis?.headline || 'the crisis'}" and demonstrated ${winner?.personality?.slice(0, 30) || 'relevant expertise'}...`,
          consensusScore: Math.floor(Math.random() * 30) + 40
        };
        
        res.writeHead(200);
        res.end(JSON.stringify({ resolution }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Load persisted data on startup
loadAgentMemory();
loadSessionState();

server.listen(CONFIG.PORT, () => {
  console.log('🎰 VENT MACHINE PROXY v3.3 - PERSISTENCE + MEMORY DECAY');
  console.log(`Port: ${CONFIG.PORT}`);
  console.log(`Data Dir: ${DATA_DIR}`);
  console.log(`Memory Decay: ${CONFIG.MEMORY_DECAY_HOURS} hours`);
  console.log(`Agents: ${Object.keys(AGENT_SOULS).length} souls loaded`);
  console.log(`Session Crises: ${sessionState.totalCrises}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Saving state...]');
  saveAgentMemory();
  saveSessionState();
  process.exit(0);
});
