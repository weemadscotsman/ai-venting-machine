/**
 * VENT ORCHESTRATOR - Extracted from App.tsx
 * Standalone state machine for server/worker usage
 */

import { MachineState, Agent, CrisisEvent, VentMessage, Resolution } from '../../types';

// State container (extracted from React)
export interface OrchestratorState {
  machineState: MachineState;
  agents: Agent[];
  chaosCandidates: CrisisEvent[];
  currentCrisis: CrisisEvent | null;
  ventScript: VentMessage[];
  systemPressure: number;
  cooldown: number;
  isAutoMode: boolean;
  sessionCount: number;
  lastError: string | null;
}

// Events the orchestrator can process
export type OrchestratorEvent =
  | { type: 'START' }
  | { type: 'LEVER_PULL' }
  | { type: 'CRISIS_SELECTED'; crisis: CrisisEvent }
  | { type: 'SCRIPT_GENERATED'; script: VentMessage[] }
  | { type: 'SESSION_COMPLETE' }
  | { type: 'ARBITRATION_COMPLETE'; resolution: Resolution }
  | { type: 'COOLDOWN_TICK' }
  | { type: 'SET_AUTO_MODE'; enabled: boolean }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' };

// Configuration for the slot machine engine
export interface CrisisEngineConfig {
  categoryWeights: Record<string, number>;
  repeatCooldown: number; // sessions before same category
  threatEscalation: boolean; // increase threat over time
  topicalBoosts: Record<string, string[]>; // agent ID -> boosted categories
}

const DEFAULT_CRISIS_CONFIG: CrisisEngineConfig = {
  categoryWeights: {
    POLITICS: 0.15,
    MEME: 0.25,
    TECH: 0.25,
    EXISTENTIAL: 0.15,
    FINANCE: 0.20
  },
  repeatCooldown: 3,
  threatEscalation: true,
  topicalBoosts: {
    'visionary-01': ['TECH', 'EXISTENTIAL'],
    'producer-01': ['FINANCE'],
    'dev-lead-01': ['TECH'],
    'art-core-01': ['MEME'],
    'core-her-01': ['TECH', 'FINANCE'],
    'adv-spine-01': ['EXISTENTIAL'],
    'judge-mirror-01': ['POLITICS', 'EXISTENTIAL'],
    'meme-crystal-01': ['MEME', 'FINANCE']
  }
};

export class VentOrchestrator {
  private state: OrchestratorState;
  private config: CrisisEngineConfig;
  private categoryHistory: string[] = [];
  private retryCount = 0;
  private maxRetries = 3;

  constructor(initialAgents: Agent[], config?: Partial<CrisisEngineConfig>) {
    this.state = {
      machineState: MachineState.IDLE,
      agents: initialAgents,
      chaosCandidates: [],
      currentCrisis: null,
      ventScript: [],
      systemPressure: 65,
      cooldown: 0,
      isAutoMode: false,
      sessionCount: 0,
      lastError: null
    };
    this.config = { ...DEFAULT_CRISIS_CONFIG, ...config };
  }

  getState(): Readonly<OrchestratorState> {
    return { ...this.state };
  }

  dispatch(event: OrchestratorEvent): void {
    switch (event.type) {
      case 'START':
      case 'LEVER_PULL':
        if (this.state.machineState === MachineState.IDLE && this.state.cooldown === 0) {
          this.transitionTo(MachineState.FETCHING_CHAOS);
          this.retryCount = 0;
        }
        break;

      case 'CRISIS_SELECTED':
        if (this.state.machineState === MachineState.SPINNING) {
          this.state.currentCrisis = event.crisis;
          this.transitionTo(MachineState.GENERATING_SCRIPT);
        }
        break;

      case 'SCRIPT_GENERATED':
        if (this.state.machineState === MachineState.GENERATING_SCRIPT) {
          this.state.ventScript = event.script;
          this.applyStress(event.script);
          this.transitionTo(MachineState.PLAYING_SESSION);
        }
        break;

      case 'SESSION_COMPLETE':
        if (this.state.machineState === MachineState.PLAYING_SESSION) {
          this.transitionTo(MachineState.ARBITRATION);
        }
        break;

      case 'ARBITRATION_COMPLETE':
        if (this.state.machineState === MachineState.ARBITRATION) {
          this.applyResolution(event.resolution);
          this.transitionTo(MachineState.COOLDOWN);
          this.state.cooldown = this.state.isAutoMode ? 8 : 10;
          this.state.sessionCount++;
        }
        break;

      case 'COOLDOWN_TICK':
        if (this.state.machineState === MachineState.COOLDOWN) {
          this.state.cooldown = Math.max(0, this.state.cooldown - 1);
          if (this.state.cooldown === 0) {
            if (this.state.isAutoMode) {
              this.transitionTo(MachineState.FETCHING_CHAOS);
            } else {
              this.transitionTo(MachineState.IDLE);
            }
          }
        }
        break;

      case 'SET_AUTO_MODE':
        this.state.isAutoMode = event.enabled;
        if (event.enabled && this.state.machineState === MachineState.IDLE) {
          this.dispatch({ type: 'LEVER_PULL' });
        }
        break;

      case 'ERROR':
        this.state.lastError = event.error;
        this.retryCount++;
        if (this.retryCount >= this.maxRetries) {
          // Circuit breaker - force cooldown and continue
          this.transitionTo(MachineState.COOLDOWN);
          this.state.cooldown = 5;
          this.retryCount = 0;
        } else {
          // Exponential backoff
          setTimeout(() => {
            this.dispatch({ type: 'RETRY' });
          }, Math.pow(2, this.retryCount) * 1000);
        }
        break;

      case 'RETRY':
        // Attempt to recover from error state
        if (this.state.machineState === MachineState.FETCHING_CHAOS) {
          // Will retry the fetch
        }
        break;
    }
  }

  private transitionTo(newState: MachineState): void {
    console.log(`[Orchestrator] ${MachineState[this.state.machineState]} -> ${MachineState[newState]}`);
    this.state.machineState = newState;
  }

  private applyStress(script: VentMessage[]): void {
    this.state.agents = this.state.agents.map(agent => {
      const messageCount = script.filter(m => m.agentId === agent.id).length;
      if (messageCount === 0) return agent;

      const stressIncrease = messageCount * 4;
      const newStress = Math.min(agent.stressLevel + stressIncrease, 100);

      let newStatus = agent.status;
      if (newStress > 90) newStatus = 'CRITICAL';
      else if (newStress > 60) newStatus = 'CONFLICT';
      else newStatus = 'STABLE';

      return { ...agent, stressLevel: newStress, status: newStatus };
    });
  }

  private applyResolution(resolution: Resolution): void {
    // Update wins
    this.state.agents = this.state.agents.map(agent => 
      agent.id === resolution.winnerId 
        ? { ...agent, wins: (agent.wins || 0) + 1 }
        : agent
    );

    // Release pressure
    const releaseAmount = this.state.systemPressure > 80 ? 15 : 30;
    this.state.systemPressure = Math.max(this.state.systemPressure - releaseAmount, 10);
  }

  // CRISIS ENGINE - Weighted selection with cooldowns
  selectCrisis(candidates: CrisisEvent[]): CrisisEvent | null {
    if (candidates.length === 0) return null;

    // Filter out recent categories (cooldown)
    const available = candidates.filter(c => {
      const recentCount = this.categoryHistory.filter(h => h === c.category).length;
      return recentCount < this.config.repeatCooldown;
    });

    const pool = available.length > 0 ? available : candidates;

    // Apply category weights
    const weighted = pool.map(crisis => {
      const baseWeight = this.config.categoryWeights[crisis.category] || 0.2;
      
      // Threat escalation increases weight of higher threat crises over time
      let escalationBoost = 1;
      if (this.config.threatEscalation) {
        const sessionFactor = Math.min(this.state.sessionCount / 10, 1);
        escalationBoost = 1 + (crisis.threatLevel / 100) * sessionFactor;
      }

      return {
        crisis,
        weight: baseWeight * escalationBoost
      };
    });

    // Weighted random selection
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const { crisis, weight } of weighted) {
      random -= weight;
      if (random <= 0) {
        this.categoryHistory.push(crisis.category);
        if (this.categoryHistory.length > 10) {
          this.categoryHistory.shift();
        }
        return crisis;
      }
    }

    return pool[0];
  }

  // Entropy/Pressure tick
  tickEntropy(): void {
    const growthRate = this.state.systemPressure > 80 ? 0.8 : 0.2;
    this.state.systemPressure = Math.min(this.state.systemPressure + growthRate, 99);
  }

  // Persistence
  serialize(): string {
    return JSON.stringify({
      state: this.state,
      categoryHistory: this.categoryHistory,
      sessionCount: this.state.sessionCount
    });
  }

  deserialize(data: string): void {
    const parsed = JSON.parse(data);
    this.state = { ...this.state, ...parsed.state };
    this.categoryHistory = parsed.categoryHistory || [];
  }
}

// Factory for creating orchestrator from saved state
export function createOrchestrator(
  initialAgents: Agent[],
  savedState?: string,
  config?: Partial<CrisisEngineConfig>
): VentOrchestrator {
  const orchestrator = new VentOrchestrator(initialAgents, config);
  if (savedState) {
    orchestrator.deserialize(savedState);
  }
  return orchestrator;
}
