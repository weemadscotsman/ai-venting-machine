# 🧠 CANN.ON.AI VENTING MACHINE

> **"Instead of Error → crash, we get Error → vent → reorganise → continue functioning."**

The **AI Venting Machine** is a cognitive defragmentation system for synthetic agents. It simulates a high-stress Game Dev Studio where AI agents with distinct personalities (Director, Producer, Dev, QA, etc.) react to generated crisis events.

It serves as both a **narrative engine** and a **debugging interface** for observing how specialized AI personas handle conflicting goals, decision fatigue, and emotional entropy.

---

## 🎮 FEATURES

### 1. The Chaos Engine
- **Slot Machine Mechanic**: Pull the lever to fetch real-world tech/gaming crises (or simulate them via LLM).
- **Crisis Categories**: Tech Debt, Meme Reviews, Financial Collapse, Existential Dread.
- **Threat Levels**: Visualized by the "Studio Burnout" pressure gauge.

### 2. The Simulation Loop
1.  **Crisis Injection**: A random event is selected (e.g., "Unity Pricing Change").
2.  **Vent Session**: Agents argue, panic, and strategize in a group chat format.
3.  **Arbitration**: A "Judge" AI analyzes the chat, picks a winner, and enforces a decision.
4.  **Evolution**: Winning agents gain influence; losing agents gain stress or evolve new personality traits.

### 3. Agent Roster
- **Pre-configured Squad**: 12 unique agents (Val the Visionary, Scope Sam the Producer, Crunch Cody, etc.).
- **Visual Status**: Real-time tracking of Stress (%), Status (STABLE/CRITICAL), and Psych Drift.
- **Custom Agents**: You can "Hire" new custom-prompted agents into the simulation.

### 4. Technical Features
- **BYOK (Bring Your Own Key)**: Supports Google Gemini, OpenAI, Anthropic, Moonshot, and Local LLMs (Ollama).
- **Infinite Mode**: "Auto-Crunch" toggles a loop that runs indefinitely, creating a generative TV show.
- **TTS (Text-to-Speech)**: Integrated Gemini Audio for agent voices (requires Gemini API Key).
- **Persistence**: All simulation state, logs, and agent evolution are saved to your browser's LocalStorage.

---

## 🚀 QUICK START

### Prerequisites
- Node.js & npm/yarn
- An API Key from **Google Gemini** (Recommended for full features + TTS) or OpenAI/Anthropic/Moonshot.

### Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm start
    ```

3.  **Open in Browser**:
    Navigate to `http://localhost:3000` (or the port shown in your terminal).

### Configuration
1.  Click the **⚙ Config** button in the top header.
2.  Select your **Provider** (Gemini, OpenAI, Local, etc.).
3.  Enter your **API Key**.
    *   *Note: Keys are stored in your browser's LocalStorage. They are never sent to a backend server.*
4.  Click **Confirm Config**.

---

## 🕹️ HOW TO PLAY

1.  **Check the Burnout Meter**: If it's low, the studio is safe. If it's >90%, expect chaos.
2.  **Pull the Lever**: Click the big red lever (or "Start Sprint").
3.  **Watch the Show**:
    *   The Slot Machine picks a crisis.
    *   The Script generates.
    *   Agents act out the scenario.
4.  **Arbitration**: Wait for the "Judge" to decide the outcome.
5.  **Cooldown**: The system compresses logs and reduces entropy.
6.  **Repeat**: Or toggle the "Infinite Loop" switch on the lever to let it run forever.

---

## ⚠️ EPILEPSY & AUDIO WARNING
- This UI contains **flashing lights**, **glitch effects**, and **screen shake** animations at high stress levels.
- Audio (if enabled via Gemini) can be generated rapidly.

---

## 📂 PROJECT STRUCTURE

- **`/src`**: Application source code.
- **`geminiService.ts`**: The brain. Handles all LLM orchestration, prompting, and parsing.
- **`types.ts`**: Data models for Agents, Logs, and State Machines.
- **`soul.md`**: The philosophical design document.
- **`goals.md`**: Current roadmap and system audit.
