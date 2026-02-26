# AI Venting Machine — Project Summary

> A dysfunctional game studio crisis simulator where agents vent about disasters, remember grudges, and form alliances.

---

## Quick Start

```bash
# 1. Install & run proxy (keeps API keys out of browser)
cd api && npm install && node proxy.cjs   # Port 3002

# 2. Install & run frontend
cd .. && npm install && npm run dev       # Port 3000

# 3. Open http://localhost:3000
```

**Prerequisites**: Node.js 20+, Gemini API key in `api/.env`

---

## Read This First

| File | What It Does | Why Read It |
|------|--------------|-------------|
| `README.md` | Project overview, architecture diagram | 30-second orientation |
| `DEPLOYMENT.md` | Production build & deploy steps | When you're ready to ship |
| `src/orchestrator/ventOrchestrator.ts` | **Core state machine** — slot machine logic, crisis selection, event flow | This is the brain |
| `src/services/llmService.ts` | Memory system, relationships, de-escalation, prompt plumbing | How agents remember |
| `src/services/geminiService.ts` | Actual Gemini API calls via `@google/genai` | Provider layer |
| `src/components/SlotMachine.tsx` | The spinning slot machine UI | The spectacle |
| `src/components/ArbitrationOverlay.tsx` | Post-crisis intervention UI | Player agency |

---

## The Engineering Highlights

### 1. Real State Machine (Not React Spaghetti)

```typescript
// Events drive everything — portable to worker/server later
type VentEvent =
  | { type: 'START' }
  | { type: 'LEVER_PULL' }
  | { type: 'CRISIS_SELECTED'; crisis: CrisisEvent }
  | { type: 'SCRIPT_GENERATED'; script: VentMessage[] }
  | { type: 'ARBITRATION_START' }
  | { type: 'ARBITRATION_COMPLETE'; action: ArbitrationAction }
  | { type: 'RESET' };
```

The orchestrator is **serializable** — dump `state.value` + `context` to JSON, resume later on any thread.

### 2. Crisis Selection Is Actually Smart

Not fake-random. Weighted system with memory:

```typescript
// Category weights (some crises are rarer)
weights: { technical: 1.0, interpersonal: 0.8, existential: 0.4 }

// Repeat cooldown (don't repeat category for N sessions)
cooldown: { lastCategories: ['technical'], cooldownRemaining: 2 }

// Escalation boost (threatLevel rises with session entropy)
escalation: { baseThreat: 20, maxThreat: 95, entropyMultiplier: 1.5 }
```

Result: Early game = server crashes. Late game = existential dread.

### 3. Agent Memory Beyond Chat History

```typescript
interface AgentMemory {
  scars: { text: string; severity: 1-10; timestamp }[];        // Permanent trauma
  grudges: { target: string; reason: string; timestamp }[];    // Who they hate
  alliances: { ally: string; formedAt; betrayed?: boolean }[]; // Who they trust
  relationships: Map<agentId, -100 to 100>;                    // Dynamic scores
  catchphrases: string[];                                      // Learned verbal tics
  wins: number; losses: number;                                // Track record
}
```

Agents carry emotional state **across sessions**. Scarred agents panic faster. Allied agents defend each other.

### 4. Security: Browser → Proxy → LLM

```
┌─────────┐     ┌─────────────┐     ┌─────────┐
│ Browser │────▶│ Local Proxy │────▶│ Gemini  │
│ (no keys)│     │ (Port 3002) │     │         │
└─────────┘     └─────────────┘     └─────────┘
```

Frontend never sees `GEMINI_API_KEY`. Proxy adds:
- Rate limiting (requests per window)
- Response caching (for identical crisis hashes)
- Request sanitization

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `PressureGauge` | Real-time studio stress visualization |
| `SlotMachine` | Weighted crisis selector with animation |
| `ArbitrationOverlay` | Player intervenes to de-escalate/aggravate |
| `SocialMemoryGraph` | D3.js network of agent relationships |
| `VentLog` | Scrollable crisis history with timestamps |

---

## Data Flow (One Crisis Cycle)

```
1. Player pulls lever
        │
        ▼
2. Orchestrator: LEVER_PULL event
        │
        ▼
3. Weighted selection + cooldown check + escalation boost
        │
        ▼
4. Crisis selected → CRISIS_SELECTED event
        │
        ▼
5. llmService: Build prompt with agent memories + relationships
        │
        ▼
6. geminiService → Proxy → Gemini API
        │
        ▼
7. Script returned → SCRIPT_GENERATED event
        │
        ▼
8. Agents vent (typed animation, emotion particles)
        │
        ▼
9. Arbitration overlay (player choice)
        │
        ▼
10. Relationships updated, scars logged, state persisted
```

---

## File Map

```
src/
├── orchestrator/
│   └── ventOrchestrator.ts      # State machine (START → LEVER_PULL → ...)
├── services/
│   ├── llmService.ts            # Memory + prompt building
│   ├── geminiService.ts         # API client
│   └── persistenceService.ts    # localStorage + serialization
├── components/
│   ├── SlotMachine.tsx          # Crisis selector UI
│   ├── ArbitrationOverlay.tsx   # Intervention UI
│   ├── SocialMemoryGraph.tsx    # Relationship viz
│   └── PressureGauge.tsx        # Studio stress meter
├── hooks/
│   └── useVentSession.ts        # React hook for orchestrator
└── types/
    └── vent.ts                  # CrisisEvent, VentMessage, AgentMemory, etc.

api/
├── proxy.cjs                    # Express proxy (no keys in browser)
└── .env                         # GEMINI_API_KEY (gitignored)
```

---

## One Code Snippet Worth Seeing

From `ventOrchestrator.ts` — the weighted crisis picker with all three systems:

```typescript
selectCrisis(crises: CrisisEvent[]): CrisisEvent {
  // 1. Filter out cooling-down categories
  const available = crises.filter(c => 
    !this.context.cooldowns.lastCategories.includes(c.category)
  );
  
  // 2. Apply weights + escalation boost
  const weighted = available.map(c => ({
    crisis: c,
    weight: c.weight * (1 + this.context.escalation.threatLevel / 100)
  }));
  
  // 3. Weighted random selection
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * total;
  
  for (const { crisis, weight } of weighted) {
    random -= weight;
    if (random <= 0) return crisis;
  }
}
```

---

## Audit Response Summary

The `AUDIT_RESPONSE.md` addressed:

| Issue | Fix |
|-------|-----|
| "Crisis selection feels random" | Added weighted categories + cooldowns |
| "No sense of progression" | Threat escalation tied to session entropy |
| "React state is spaghetti" | Extracted to `ventOrchestrator.ts` state machine |
| "Hard to test" | Events are serializable, time-travel debuggable |

---

## Bottom Line

This isn't just a chat UI. It's a **persistent agent simulation** with:
- Real state machine orchestration
- Weighted probabilistic crisis generation
- Long-term memory (scars, grudges, alliances)
- Secure API key handling
- Portable event architecture

Start with `ventOrchestrator.ts` to see the brain, then `llmService.ts` for the memory model.
