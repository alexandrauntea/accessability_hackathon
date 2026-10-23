# VibeCheck — Your Workday, Adapted to Your Capacity

> **AccessABILITY Hackathon 2026** · Team: Andreea, Alexandra, Alina  
> Built for adults entering their first job with **invisible and fluctuating disabilities** (chronic illness, neurodivergence, psychosocial conditions).

---

## The Problem & Solution

- **The Problem:** Symptoms fluctuate day to day, but workplace schedules and expectations remain rigid. Early-career employees rarely ask for adjustments due to fear of stigma, not knowing what is acceptable, or difficulty finding the right words under flare or sensory overload.
- **The Solution:** A 10-second check-in translates lived daily sensations into an actionable **Daily Capacity score (1–10)** that re-aligns the workday schedule, inserts protective breaks, scaffolds blocked tasks, and drafts stepped workplace accommodation requests.

---

## Core Features

1. **10-Second Daily Check-in (`/checkin`)**
   - Rate 2–3 personalized scales or speak one natural sentence via voice dictation.
   - Computes a transparent **Daily Capacity (1–10)** with clear anchors (*e.g., 2/10 = Low Capacity / Hard Day*).
   - Multi-modal confirmation with vibration and audio cues.

2. **Adaptive Workday (`/day`)**
   - Integrates schedule (Google Calendar) and tasks (Jira backlog mock adapters).
   - Transparent AI re-planning: every change includes an explicit, plain-language reason.
   - Low-capacity protection (≤ 3 tasks, automatic rest breaks, async/postponed meetings).
   - **Help me start**: Breaks blocked tasks into a concrete first step under 5 minutes.

3. **Deterministic Insights & Trends (`/insights`)**
   - Historical statistical patterns computed entirely in code (no hallucinated metrics).
   - Generates plain-language weekly summaries and actionable trends (*e.g., lower capacity on Mondays*).

4. **Workplace Adjustment Requests (`/support`)**
   - Interactive clarification assistant for workplace accommodation needs.
   - Stepped disclosure tiers: **Full** (includes condition), **General** (functional impact only), or **Private** (confidential/HR-only).
   - Generates editable email/Slack drafts ready for one-click review and send.

5. **Speak For Me / AAC (`/speak`)**
   - Augmentative & Alternative Communication for meetings.
   - Quick common workplace phrases + AI-polished contributions read aloud via TTS and copied to meeting chat.

---

## Accessibility & Responsible AI by Design

- **Visual & Motor:** WCAG 2.2 AA compliant, Atkinson Hyperlegible typography, high-contrast palette, minimum 48px touch targets, visible keyboard focus rings.
- **Audio & Cognitive:** Text-to-speech reading available on every screen, no audio-only cues, no emojis or ambiguous jargon, adult operational tone.
- **Privacy & Safety:** Zero medical diagnoses or unsolicited medical advice, strict owner-only Firestore security rules, client/server crisis detection triggers emergency resources.
- **Resilient AI Fallback:** Deterministic offline heuristics for 100% reliable operation during live demos, even without internet or when encountering Gemini quota limits.

---

## Tech Stack

- **Frontend:** React Native / Expo Web (SDK 52), TypeScript, Atkinson Hyperlegible, Web Speech API & Expo Speech.
- **Backend:** Firebase Cloud Functions v2 (TypeScript, `europe-west1`), Firebase Auth, Cloud Firestore.
- **AI Engine:** Google Gemini 2.5 Flash / Flash Lite via `@google/genai` with deterministic local fallback engine.

---

## Getting Started

### 1. Prerequisites
- Node.js 20+
- npm 10+

### 2. Frontend Setup (Expo Web)
```bash
npm install
cp .env.example .env            # Configure Firebase web keys
npm run web                     # Starts Expo web on http://localhost:8081
```

### 3. Backend Setup (Cloud Functions)
```bash
cd functions
npm install
npm run build                   # Compiles TypeScript and syncs shared types
```

### 4. AI Mode Configuration
In `.env` or `functions/.env`:
- `EXPO_PUBLIC_AI_MODE=fallback` — Instant deterministic local responses (recommended for 100% reliable demo).
- `EXPO_PUBLIC_AI_MODE=live` — Calls Gemini live via Cloud Functions.

---

## Live Demo Walkthrough (Ioana Popescu)

1. **Sign In**: Tap **"Demo: Sign in as Ioana Popescu (Junior Data Analyst)"** on the login screen.
2. **Check-in**:
   - Go to **Today** → **Check-in**.
   - Speak or type flare symptoms (*e.g., "Severe flare: energy is 2, pain is 9, brain fog is 10"*) → Tap **"Fill the scales from this sentence"**.
   - Scales update to *Physical energy: 2, Pain: 9, Brain fog: 10* → Capacity calculates to **2/10 (Low capacity)** → Confirm and save.
3. **My Day Adaptation**:
   - Observe the banner: *"Your capacity changed to 2. Adapt again?"*
   - Tap **"Adapt my day"** → Watch meetings become async, rest breaks added, and max 3 priority tasks selected.
   - Tap **"Help me start"** on a blocked task for a concrete < 5 min first step.
4. **Support Request**:
   - Navigate to **Support** → Pick needed adjustments (*e.g., flexible hours / quiet space*).
   - Select **General** disclosure → Generate draft email for Andrei (Manager).

---

## Deliverables & Documentation

- [User Need & Validation](docs/VALIDATION.md)
- [Accessibility by Design](docs/ACCESSIBILITY.md)
- [Responsible AI & Safety](docs/RESPONSIBLE_AI.md)
- [Pitch Outline & Presentation](docs/PITCH.md)
- [Demo Personas Specification](docs/PERSONAS.md)
