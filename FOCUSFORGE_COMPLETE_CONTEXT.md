# FOCUS FORGE — Complete System Architecture & Context Guide

> **Production Deployment:** [https://focusforge-dcxj.vercel.app/](https://focusforge-dcxj.vercel.app/)  
> **Repository:** `probabledeadpool-original/focusforge`  
> **Version:** 2.4.0 (Sovereign Intelligence Edition)  
> **Design Philosophy:** CRED-Style Dark Luxury Minimalist Aesthetics • Obsidian Glassmorphism • Micro-Animations • Low-Latency Real-Time Telemetry

---

## 1. Executive Summary & Core Identity

**Focus Forge** is a high-performance, members-only sovereign operating system engineered for elite builders, traders, and deep-work practitioners. It merges cognitive flow architectures, multimodal neural intelligence, real-time financial telemetry, spatial acoustic DSP physics, and a remote Model Context Protocol (MCP) server into an ultra-premium web environment.

### Primary UI/UX Design System
- **Typography:** Custom lowercase headings (`font-heading font-extrabold tracking-tight lowercase`), serif titles (`font-serif lowercase`), and monospace tracking micro-labels (`font-mono text-[9px] uppercase tracking-[0.2em]`).
- **Color Palette:** Pure obsidian blacks (`#000000`, `bg-zinc-950`), subtle borders (`border-white/10 hover:border-white/30`), metallic gradients, and vibrant state accents (Cyan for speech/MCP, Rose for listening, Purple for thinking/DSP, Emerald for yield/flow, Amber for markets).
- **Physical Feel:** Heavy glassmorphism (`backdrop-filter: blur(40px) saturate(180%)`), Apple Dynamic Island morphic springs, and tactile interactive feedback.

---

## 2. Technology Stack & Frameworks

- **Core Framework:** Next.js 15.4 (App Router) & React 19.
- **Styling:** Tailwind CSS v4, Vanilla CSS Design System, Lucide React icons.
- **Animations:** Motion (`motion/react` v12), CSS hardware-accelerated spring transitions.
- **Visualizers:** `@mediapipe/tasks-vision`, `thinking-orbs`, `voice-glow`, `SiriWave`.
- **Audio DSP:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `ConvolverNode`, `DynamicsCompressorNode`, `StereoPannerNode`).
- **Media & PDF:** `pdfjs-dist`, `react-pdf`, YouTube IFrame API with custom 4K wrapper.
- **AI & Neural Integration:** Google GenAI SDK (`@google/genai`), Gemini 2.5 Pro / Flash, Gemma 4 26B, Claude/Grok-compatible MCP Server.
- **State Management:** Zustand stores with `localStorage` persistence and cross-component custom event dispatchers.
- **Data Validation & Protocols:** `zod` schema enforcement, JSON-RPC 2.0 Streamable HTTP transport.

---

## 3. Comprehensive Feature & Module Breakdown

### 3.1 Everything Island (`EverythingIsland.tsx`)
The centerpiece of the application is a morphic floating island anchored at the top of the viewport inspired by Apple's Dynamic Island:
- **States & Modes:**
  - `mini`: Compact idle capsule.
  - `jarvis-orb`: **Apple Intelligence Spherical Glass Bubble** (`52px x 52px`) with chromatic iridescent lens refraction horizon arc, specular dome reflection, and embedded `ThinkingOrb` / `SiriWave`. Clicking it instantly expands the full HUD.
  - `search`: Universal search launcher with Google, YouTube Data API v3, and local intelligence mode.
  - `shelf`: Fast-drop memory cache and drag-and-drop workspace.
  - `ai`: Integrated Gemini copilot chat with metallic typography and Markdown rendering.
  - `frequency`: Live playback bar with real-time audio waveform and track control.
  - `settings`: Quick configuration panel for AI models, API keys, and audio DSP presets.
- **Physics & Velocity Reactivity:** Dynamically scales and morphs based on user typing speed, interaction gestures, and cognitive state.

---

### 3.2 J.A.R.V.I.S. Copilot & Voice HUD (`JarvisVoiceHUD.tsx`, `jarvisVoiceEngine.ts`)
An executive AI voice companion inspired by Apple Intelligence and Tony Stark's J.A.R.V.I.S.:
- **Continuous Wake-Word Detection:** Listens continuously for `"JARVIS"` or `"Hey JARVIS"` using Web Speech API and custom phonetic matching.
- **Spot UI (On-The-Spot Generative Interface):**
  - **Video Search & Voice Playback:** Search YouTube via voice; wave animations glide aside to present video cards; selecting a video by voice (`"play the first video"`) loads it directly into the custom theatre player.
  - **Live Financial Charts:** Asking for stock prices (e.g. `"What is Reliance trading at?"` or `"Check Apple stock"`) dynamically renders interactive sparklines and intraday charts for Indian (NSE/BSE) and US equities.
  - **Live World Pulse:** Real-time breaking headlines, geopolitical briefings, and economic calendar cards.
- **Thinking Orbs & Siri Wave Visualizer:** 9 hand-tuned animated cognitive states (`listening`, `thinking`, `speaking`, `searching`, `solving`, `connecting`, `weaving`, `breathing`, `standby`).
- **Autonomous Tool Dispatching:** Executes workspace tasks, audio adjustments, and navigation commands automatically via voice.

---

### 3.3 The Place & Atmospheric 4K Theatre (`ThePlace.tsx`, `CustomYouTubePlayer.tsx`)
An immersive cinema and ambient soundscape player engineered to sustain deep focus:
- **Vault & Curated Streams:** Tokyo rain, cyberpunk lofi, synthwave, 432Hz binaural frequencies, and custom YouTube playlist archives.
- **Void Shift Mode:** Pure distraction-free fullscreen mode with peripheral lumen ghost scrubber and zero UI clutter.
- **Ambient Lumen Glow:** Dynamic real-time peripheral glow calculating the dominant colors of the active stream.
- **Browser-Level Document Picture-in-Picture Miniplayer (`/lib/documentPiP.ts`):**
  - Uses the official W3C `window.documentPictureInPicture.requestWindow({ width, height })` API.
  - Automatically clones parent document stylesheets into the floating OS window.
  - Embedded synchronized playback controls (Play/Pause, Mute/Unmute, Seek -10s/+10s, Close).
  - Handles `pagehide` teardown and restores main window playback position smoothly.
  - Seamless fallback to standard `HTMLVideoElement.requestPictureInPicture()`.

---

### 3.4 The Frequency & 432Hz DSP Audio Engine (`useFrequencyStore.ts`, `FrequencyAudioEngine.tsx`)
A studio-grade real-time digital signal processing (DSP) acoustic workstation:
- **432Hz Natural Harmonic Calibration:** Mathematically shifts pitch and harmonic resonances to promote alpha wave generation and stress reduction.
- **Audio DSP Enhancement Presets:**
  - `original`: Direct unadulterated bitstream.
  - `enhanced`: Warm harmonic exciter with gentle acoustic clarity.
  - `immersive`: Spatial 3D room reverb and binaural stereo width expansion.
  - `bass-titan`: Sub-bass harmonic saturation (40Hz–90Hz punch).
  - `vocal-air`: Pristine dialogue presence and high-frequency sheen for podcasts and lectures.
- **Binaural Wave Generator:** Dedicated sine tone oscillators generating Alpha (10Hz), Beta (18Hz), Theta (6Hz), and Gamma (40Hz) cognitive entrainment frequencies.

---

### 3.5 Markets & Financial Intelligence (`Markets.tsx`, `useMarketsStore.ts`)
A Bloomberg-style sovereign financial terminal:
- **Global Coverage:** Live market telemetry for Indian Equities (NSE/BSE Nifty 50, Sensex, Reliance, Tata, HDFC), US Markets (S&P 500, Nasdaq 100, NVDA, AAPL, TSLA), Forex, and Crypto.
- **Trading Intelligence:** Intraday momentum scans, volume spikes, moving average crossovers, and algorithmic trend strength scoring.
- **Macro Pulse:** Synchronized breaking news ticker and economic events calendar.

---

### 3.6 The Ledger & Sovereign Capital (`Ledger.tsx`)
A modular workspace and productivity capital staking system:
- **Modular Block Editor:** Notion/Obsidian-style block editor supporting `h1`, `h2`, `paragraph`, `bullet`, `todo`, `quote`, `divider`, and `code`.
- **Focus Yield Multipliers:** Earn Maybach Coins and capital dividends dynamically as focus sprints and deep work hours accumulate.
- **Sovereign Treasury Staking:** Asset allocation tracking across Sovereign Treasury (USDC/Cash), Algorithmic Focus Staking, High-Conviction Equities, and Deep Work Liquidity Pools.

---

### 3.7 AURA Identity & Biometric Flow (`useAuraStore.ts`, `useAuraIntegration.ts`)
A gamified neural identity and telemetry engine:
- **AURA Score Breakdown (0–1000):** Discipline, Focus, Consistency, Emotional Stability, Growth, Momentum, and Self-Respect.
- **Identity Evolution Tiers:** Novice $\rightarrow$ Seeker $\rightarrow$ Sovereign Architect $\rightarrow$ Grandmaster.
- **Vision Telemetry (`GesturesMode.tsx`):**
  - **Fatigue & Microsleep Detection:** Uses MediaPipe FaceLandmarker blendshapes (`eyeBlinkLeft`, `eyeBlinkRight`) to trigger alerts if eyes close for $>1.5$s or head nods off.
  - **Contactless Hand Gestures:** Open Palm (Play/Pause), Thumb Up (+10s), Thumb Down (-10s), Victory (2x Speed), Fist (1x Speed).

---

### 3.8 Remote Model Context Protocol (MCP) Server (`/api/mcp` & `/api/health`)
An enterprise-grade JSON-RPC 2.0 Streamable HTTP server connecting external AI agents (Claude Desktop, Grok, Manus, Cursor) directly to Focus Forge:
- **Endpoint:** `https://focusforge-dcxj.vercel.app/api/mcp`
- **Health & Discovery:** `https://focusforge-dcxj.vercel.app/api/health`
- **Authentication:** `Authorization: Bearer <MCP_AUTH_TOKEN>`
- **12 Implemented Read-Only Tools:**
  1. `get_current_user`: Active user profile, sovereign tier, AURA score breakdown.
  2. `list_projects`: Workspaces and notebook vaults with category filtering.
  3. `get_project`: Full project document structure and block contents.
  4. `list_tasks`: Action items, directives, and checklist statuses.
  5. `search_tasks`: Keyword search across all workspace tasks.
  6. `get_task`: Specific task metadata and priorities.
  7. `get_focus_sessions`: Deep work session durations, efficiency ratings, and timestamps.
  8. `get_productivity_summary`: Streak analytics, burnout risk metrics, and flow distribution.
  9. `get_activity_history`: Timeline of ledger yields and evolution milestones.
  10. `get_video_metadata`: Title, channel, duration, and PiP flags for atmospheric streams.
  11. `get_video_transcript`: Synchronized transcript segments and timestamps.
  12. `get_video_summary`: Concise focus insights and key concepts from vault videos.

---

## 4. Key Global Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>J</kbd> / <kbd>Cmd</kbd> + <kbd>J</kbd> | Launch J.A.R.V.I.S. Voice HUD |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Universal Search in Dynamic Island |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | Trigger Atmospheric Fog Immersion Mode |
| <kbd>Space</kbd> | Play / Pause Active Video or Focus Timer |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | Seek Video -10s / +10s |
| <kbd>Esc</kbd> | Exit Void Shift / Dismiss Modals |

---

## 5. Connecting AI Clients to Focus Forge MCP

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "focusforge": {
      "url": "https://focusforge-dcxj.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

### Grok / Manus / Generic Remote MCP Client
- **Transport:** Streamable HTTP / JSON-RPC 2.0
- **Endpoint:** `https://focusforge-dcxj.vercel.app/api/mcp`
- **Method:** `POST` with `Authorization: Bearer <token>`
- **Capabilities:** `tools/list`, `tools/call`, `initialize`, `ping`.

---

## 6. Local Development & Verification Commands

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Run TypeScript strict type-check
npx tsc --noEmit

# 3. Run Remote MCP test suite
npx tsx scripts/test-mcp.ts

# 4. Start Next.js Development Server
npm run dev
```
