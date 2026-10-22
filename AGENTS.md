# VibeCheck — agent context (read this first)

VibeCheck is a hackathon prototype (AccessABILITY Hackathon 2026, theme: AI for an inclusive first job).
It is a work assistant for people with **invisible and fluctuating disabilities**: chronic illness
(endometriosis, fibromyalgia, chronic migraine, lupus, Hashimoto, rheumatoid arthritis, long COVID, ME/CFS,
secondarily MS), neurodivergence (ADHD, autism, dyslexia) and psychosocial disabilities (anxiety, depression, burnout).

Core loop: **10-second check-in (2-3 personal metrics, voice or tap) → unified Daily Capacity 1-10 → insights & AI summary → AI-adapted day (calendar + tasks, per user category) → AI-clarified accommodation request emailed to HR/manager after user review.** Plus "Speak for me" (AAC) in meetings.

## Users and metrics (src/shared/metrics.ts)
| Category | Metrics (pick 2-3 at onboarding) | What the AI does |
|---|---|---|
| chronic (endometriosis, fibromyalgia, migraine, autoimmune, long COVID, ME/CFS, MS) | physical_energy, pain, brain_fog | reschedules meetings, break blocks, drafts "make it async" messages |
| neurodivergent (ADHD, autism, dyslexia) | focus, sensory_load, social_battery | 5-minute first steps for Jira tasks, protected deep work, drops non-essential 1:1s |
| psychosocial (anxiety, depression, burnout) | anxiety, overwhelm | hard-day mode with reduced notifications, fewer decisions, drafted Slack replies |
All metrics are 1-10 with factual anchors (no emojis). They reduce to ONE number, Daily Capacity (1 = only short async tasks, 5 = normal, 10 = full flow), via `deriveCapacity()`. The employer only ever sees this number, and only inside a request the user sends.

## Demo personas (src/mocks/personas.ts) — one account each (separate browser profile / phone)
Ioana (chronic, Junior Data Analyst) · Matei (neurodivergent, Junior QA Engineer, uses Speak for me) · Elena (psychosocial, Junior Marketing Specialist, overload signal).
Today → Demo tools → "Be <name>" loads profile + 6 weeks of check-ins; mock calendar/tasks follow `profile.demoPersona`.

## Stack
- Expo (SDK 54+) + expo-router, TypeScript strict. **Main demo = Expo web** (`npm run web`), **second device = phone via Expo Go** (`npx expo start`, scan QR). Code must run on both: guard web-only APIs with `Platform.OS`.
- Only Expo Go-compatible modules (no custom native code): expo-speech (TTS), expo-haptics, expo-audio, expo-clipboard, expo-auth-session (web only for Google).
- Speech-to-text: Web Speech API on web; on Expo Go the user dictates with the phone keyboard microphone.
- Firebase JS SDK: anonymous Auth, Firestore, Cloud Functions v2 (callable, region `europe-west1`), Hosting.
- AI: Gemini via `@google/genai`, **only** from Cloud Functions through `functions/src/lib/ai.ts → generateJson()` (JSON + zod validation + 1 retry).
- No AI keys or third-party tokens in the client. `EXPO_PUBLIC_*` values are public.

## Team ownership (vertical slices — do not edit another person's folder)
| Owner | Client | Functions |
|---|---|---|
| Andreea — Check-in & Insights | `src/features/checkin/`, `src/features/insights/`, `src/shared/ui/`, `src/shared/theme/`, `src/shared/metrics.ts`, `src/mocks/personas.ts`, hooks `useSpeech`, `useVoiceInput`, `useFeedback` | `functions/src/checkin/` (parseCheckin, summarizeState) |
| Alexandra — Adaptive day + Speak for me | `src/features/day/`, `src/features/aac/`, `src/integrations/`, `src/shared/firebase.ts`, `useAuth.tsx` | `functions/src/day/`, `functions/src/aac/`, `functions/src/lib/ai.ts`, `lib/auth.ts` |
| Alina — Support, Onboarding & Profile | `src/features/advocate/`, `src/features/onboarding/`, `src/features/settings/`, `useProfile.ts`, `firestore.rules` | `functions/src/advocate/`, `functions/src/lib/safety.ts` |

**Frozen shared contracts** (change only in a separate small PR, announced to the team):
`src/shared/types.ts`, `src/shared/api.ts`, `src/shared/metrics.ts`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `functions/src/index.ts`.
`functions/src/lib/types.ts` is a generated copy (`npm run sync-types`) — never edit it by hand.

Cross-slice imports allowed (read-only): `getTodayCheckin`, `listCheckins` from `features/checkin/checkinRepo`, `computeStats` from `features/insights/stats`, `useProfile`. Never import screens/components from another feature.

## Rules for every change
1. **Accessibility is not optional.** Use only components from `src/shared/ui` (AppText, AppButton, Card, Screen, ScaleInput, TextField, ChipGroup, SpeakButton, AiBadge). Every interactive element: `accessibilityRole`, an `accessibilityLabel` that includes the VALUE ("Pain, 3 of 10, Noticeable; I need breaks every hour"), >= 48x48 target, reachable with Tab and activated with Space/Enter. No dropdowns or hidden menus for metrics. Never convey information by colour alone. No gesture-only actions (no drag sliders). Every screen passes `speakText` to `<Screen>`. Sizes from `useTheme().font`, colours from `useTheme().c`, corners from `useTheme().radius`, animations only if `useTheme().motion`.
1b. **Explicit, adult language.** Operational questions ("How long can you hold attention on one task today?"), not "How do you feel?". No emojis or childish icons for states. Factual scale anchors.
1c. **Confirm without sight**: after saving, call `useFeedback().confirm()` (vibration on phone + discreet sound; both can be muted in Me).
2. **Responsible AI.** Every AI output is shown with `<AiBadge why="…">`. The AI explains *why* (reasons on plan items). Statistics are computed in code (`stats.ts`), the LLM only explains them. Never send health data beyond what the feature needs. Never let the model choose email recipients. Nothing is emailed without explicit user confirmation. No medical advice.
3. **Mocks first.** Integrations go through adapters (`src/integrations/*`, `functions/src/advocate/email.ts`). A failing real integration must fall back to mock, never crash the demo.
4. **Errors**: friendly text with `accessibilityRole="alert"`; never show stack traces; never log health data in functions.
5. Keep files small; one screen per file; English for code, UI and prompts.
6. Commits: conventional (`feat(day): …`, `fix(checkin): …`), small, frequent — the jury reviews commit history.

## Firestore model (all under `users/{uid}`, owner-only rules)
`users/{uid}` UserProfile · `checkins/{YYYY-MM-DD}` Checkin · `summaries/{date}` StateSummary (functions write) · `dayPlans/{date}` DayPlan · `requests/{id}` AccommodationRequest · `outbox/{id}` sent emails (functions write).

## Commands
`npm run web` · `npm run typecheck` · `cd functions && npm run build` · `npm run deploy:functions` · `npm run deploy:web` · `npm run deploy:rules`

See `docs/` for accessibility checklist, responsible-AI notes, validation log and pitch.
Each feature folder has its own `AGENTS.md` with the backlog for that slice.
