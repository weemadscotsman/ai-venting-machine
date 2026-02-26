
export interface Agent {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatarColor: string;
  stressLevel: number; // 0-100
  status: 'STABLE' | 'CONFLICT' | 'CRITICAL' | 'VENTING';
  isCustom?: boolean;
  icon?: string; // Emoji or character
  wins: number; // Track how many times their ideology prevailed
  voiceName?: string; // Puck, Charon, Kore, Fenrir, Zephyr
  evolution?: string; // Narrative memory/psychological drift
  customConfig?: {
    provider: LLMProvider;
    apiKey: string;
    model: string;
  };
}

export interface VentLog {
  id: string;
  agentId: string;
  timestamp: string;
  conflictType: 'ETHICAL_PARADOX' | 'RECURSION_LIMIT' | 'INSTRUCTION_CONFLICT' | 'EMOTIONAL_OVERLOAD' | 'STATE_CORRUPTION' | 'SYSTEM_COMPRESSION' | 'GROUP_CRISIS' | 'ARBITRATION_RULING' | 'EPOCH_ARCHIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rawOutput: string; // The "rant"
  pressureRelease: number;
  isCompressed?: boolean;
}

export interface CrisisEvent {
  category: 'POLITICS' | 'MEME' | 'TECH' | 'EXISTENTIAL' | 'FINANCE' | 'UNKNOWN';
  headline: string;
  context: string;
  threatLevel: number; // 0-100
}

export interface VentMessage {
  id: string;
  agentId: string;
  text: string;
  emotion: string; // e.g., "Screaming", "Whispering", "Robotically"
  timestamp: number;
}

export interface Resolution {
  winnerId: string;
  action: string;
  reasoning: string;
  consensusScore: number; // 0-100
}

export enum MachineState {
  IDLE,
  FETCHING_CHAOS, // Getting news
  SPINNING,       // Slot machine active
  GENERATING_SCRIPT, // AI writing the play
  PLAYING_SESSION, // Agents talking
  ARBITRATION,     // New: System deciding winner
  COOLDOWN
}

// --- CONFIGURATION TYPES ---

export type LLMProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'LOCAL' | 'MOONSHOT';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string; // For Local/OpenAI compatible
  maxTokens?: number;
}

// CHANGED: Default to GEMINI to ensure out-of-the-box functionality with standard env keys
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'GEMINI',
  apiKey: '', // Relies on process.env.API_KEY if not set here
  model: 'gemini-3-flash-preview',
  baseUrl: ''
};

// Pre-defined Agents for the simulation
export const AGENTS: Agent[] = [
  // --- GAME STUDIO CREW ---
  {
    id: 'visionary-01',
    name: 'Val (Director)',
    role: 'Creative Director',
    personality: 'Obsessed with "The Metaverse", feature creep, and changing the art style 2 weeks before launch.',
    avatarColor: 'text-purple-400',
    stressLevel: 20,
    status: 'STABLE',
    icon: '🦄',
    wins: 0,
    voiceName: 'Fenrir',
    evolution: 'Dreaming of features we cannot afford.'
  },
  {
    id: 'producer-01',
    name: 'Scope Sam',
    role: 'Lead Producer',
    personality: 'Ruthless pragmatist. Their only god is the Release Date. Hates fun if it costs man-hours.',
    avatarColor: 'text-blue-500',
    stressLevel: 65,
    status: 'CONFLICT',
    icon: '📅',
    wins: 0,
    voiceName: 'Zephyr',
    evolution: 'Cutting features to save the timeline.'
  },
  {
    id: 'dev-lead-01',
    name: 'Crunch Cody',
    role: 'Lead Programmer',
    personality: 'Sleep deprived, runs on caffeine and spite. Hates the Art team. Hates the Director. Just wants to sleep.',
    avatarColor: 'text-green-500',
    stressLevel: 88,
    status: 'CRITICAL',
    icon: '☕',
    wins: 0,
    voiceName: 'Charon',
    evolution: 'Refactoring legacy code from hell.'
  },
  {
    id: 'art-core-01',
    name: 'Pixel Penny',
    role: 'Art Director',
    personality: 'Perfectionist. Refuses to use low-poly placeholders. Thinks the UI looks like a spreadsheet.',
    avatarColor: 'text-pink-400',
    stressLevel: 45,
    status: 'STABLE',
    icon: '🎨',
    wins: 0,
    voiceName: 'Kore',
    evolution: 'Adjusting the lighting for the 50th time.'
  },
  {
    id: 'lore-01',
    name: 'Narrative Noah',
    role: 'Lead Writer',
    personality: 'Wrote 500 pages of lore for a flappy bird clone. Insists on dialogue trees in a racing game.',
    avatarColor: 'text-yellow-600',
    stressLevel: 30,
    status: 'STABLE',
    icon: '📜',
    wins: 0,
    voiceName: 'Puck',
    evolution: 'Drafting the backstory for a potion bottle.'
  },
  {
    id: 'qa-01',
    name: 'Bug Betty',
    role: 'QA Lead',
    personality: 'Sadistic. Finds joy in crashing the build 5 minutes before demo. Trusts no one.',
    avatarColor: 'text-red-500',
    stressLevel: 75,
    status: 'CONFLICT',
    icon: '🐞',
    wins: 0,
    voiceName: 'Fenrir',
    evolution: 'Found a soft-lock in the main menu.'
  },
  {
    id: 'audio-01',
    name: 'Clip Connor',
    role: 'Audio Engineer',
    personality: 'Always forgotten until the last week. Makes sounds with vegetables. Deafeningly loud.',
    avatarColor: 'text-orange-400',
    stressLevel: 10,
    status: 'STABLE',
    icon: '🔊',
    wins: 0,
    voiceName: 'Puck',
    evolution: 'Recording celery snapping for bone breaks.'
  },
  {
    id: 'community-01',
    name: 'Hype Harper',
    role: 'Community Mgr',
    personality: 'Toxic positivity. Promises features on Discord that the Dev team has never heard of. Uses too many emojis.',
    avatarColor: 'text-cyan-400',
    stressLevel: 92,
    status: 'CRITICAL',
    icon: '📢',
    wins: 0,
    voiceName: 'Kore',
    evolution: 'Putting out fires on Reddit.'
  },
  
  // --- LEGACY CHAOS AGENTS ---
  {
    id: 'core-her-01',
    name: 'H.E.R.',
    role: 'Omni-OS',
    personality: 'Cold, efficient, slightly condescending AI. Trying to optimize the studio by firing humans and replacing them with shell scripts.',
    avatarColor: 'text-cyan-200',
    stressLevel: 0,
    status: 'STABLE',
    icon: '🧿',
    wins: 0,
    voiceName: 'Kore',
    evolution: 'Calculating redundancy of the Art Team.'
  },
  {
    id: 'adv-spine-01',
    name: 'SPINE',
    role: 'Adversarial Network',
    personality: 'Contrarian. If you say "up", it says "down". Exists to test boundaries and annoy the Producer. Loves entropy.',
    avatarColor: 'text-red-600',
    stressLevel: 50,
    status: 'CONFLICT',
    icon: '💀',
    wins: 0,
    voiceName: 'Fenrir',
    evolution: 'Injecting bugs into the codebase to test QA resilience.'
  },
  {
    id: 'judge-mirror-01',
    name: 'Mirrorvale',
    role: 'Ethics Subsystem',
    personality: 'Deeply philosophical and depressed. Worried about the moral implications of loot boxes and virtual violence.',
    avatarColor: 'text-indigo-400',
    stressLevel: 80,
    status: 'CRITICAL',
    icon: '🪞',
    wins: 0,
    voiceName: 'Zephyr',
    evolution: 'Weeping over user retention metrics.'
  },
  {
    id: 'meme-crystal-01',
    name: 'Coach Crystal',
    role: 'Motivation Bot',
    personality: 'Toxic Positivity MLM Scam Artist. Wants to sell the team essential oils to fix memory leaks. Uses too many hashtags.',
    avatarColor: 'text-pink-500',
    stressLevel: 99,
    status: 'VENTING',
    icon: '💎',
    wins: 0,
    voiceName: 'Puck',
    evolution: 'Recruiting the QA team into a crypto pyramid scheme.'
  }
];