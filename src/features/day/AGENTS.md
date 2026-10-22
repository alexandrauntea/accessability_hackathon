# Slice: Adaptive day — owner Alexandra
Also owns: `src/features/aac/` (Speak for me, see its AGENTS.md), `functions/src/aac/`, `src/integrations/`, `functions/src/day/`, `functions/src/lib/ai.ts`, Firebase setup & deploy.

## Implemented Architecture & Features

### 1. Day Planning (`DayScreen.tsx` & `functions/src/day/planDay.ts`)
- **Capacity-adapted schedule**: Adapts meetings and tasks around self-reported capacity (1–10).
- **Anti-hallucination guarantee**: Server-side filtering discards any refId not present in input events or tasks.
- **Category rules**:
  - *Chronic pain / fatigue*: Movable meetings (e.g. Sprint planning) adapted to async (`make_async`); rest breaks inserted.
  - *Neurodivergent (ADHD, Autism)*: Deep work focus block (60–90 min); non-essential social chats dropped (`drop_today`); 5-minute starter steps for complex/blocked tasks.
  - *Psychosocial / Hard day*: Reduced notification level; max 3 tasks; pre-drafted Slack check-in messages.
- **Deterministic fallback**: Seamlessly generates rule-based schedules without AI when network is offline or AI credits are depleted.

### 2. Week Patterns & "Week ahead" (`src/features/day/weekPattern.ts`)
- **Historical capacity analysis**: Consumes `computeStats(listCheckins(60))` from Andreea's slice without recalculating.
- **Pattern identification**: Detects weekdays with average capacity $\le$ overall average $- 1.5$ (minimum 3 check-ins).
- **Graceful data requirement**: Requires 2 weeks (10 workdays) of check-in data before asserting patterns; displays *"Not enough data yet (need 2 weeks)"* for new accounts.
- **Interactive week-ahead suggestions**: Identifies heavy or movable meetings on recurring low days and provides *"Draft a message"* using `composeContribution(clarify)`.

### 3. Protect My Day (`protectDay` mode)
- **Context switch reduction**: Groups movable meetings into an afternoon block (13:30 onwards).
- **Continuous focus window**: Guarantees a continuous 3-hour focus block (10:00–13:00) with assigned tasks.
- **Textual diff inspection**: Visualizes Before vs. After schedule comparisons with *Accept* and *Keep as is* options.

### 4. Meeting Briefing & Preparation (`prepareMeeting.ts`)
- **On-demand meeting briefing**: Generates clear purpose, likely questions, personal speaking points, and suggested phrases.
- **What to expect**: Discloses duration, speaking expectations (round-robin vs. open discussion), and camera expectations.
- **Direct AAC bridge**: One-click *"Add phrases to Speak for me"* saves phrases to `AsyncStorage` (`vibecheck_custom_phrases`).

### 5. Calendar & Task Providers (`src/integrations/`)
- **Google Calendar (read-only)**: Real web OAuth via `expo-auth-session` with token strictly in memory / `sessionStorage`. Heuristics map `optional` and `canBeAsync` meetings. Graceful auto-fallback to `mockCalendar` on 401 or network error.
- **Jira Tasks**: `jiraTaskProvider` behind `config.mockTasks`. Token stored securely server-side in Secret Manager.