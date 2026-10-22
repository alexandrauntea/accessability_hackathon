# Slice: Adaptive day — owner Alexandra
Also owns: `src/features/aac/` (Speak for me, see its AGENTS.md), `functions/src/aac/`, `src/integrations/`, `functions/src/day/`, `functions/src/lib/ai.ts`, Firebase setup & deploy.

## Inputs you consume
- Today's check-in via `getTodayCheckin()` (Andreea), work hours via `useProfile()` (Alina).

## Backlog
### Foundation (H0–H2)
- [ ] Firebase project (Blaze + $5 budget alert), web app config in `.env`, anonymous auth enabled, Firestore in eur3
- [ ] `GEMINI_API_KEY` secret set, `functions` deployed once, `generateJson` smoke-tested
### MVP (by H6)
- [ ] Day screen lists the persona's mock calendar + tasks (`profile.demoPersona`)
- [ ] Speak for me MVP (quick phrases + TTS + copy)
- [ ] `planDay` returns valid plan; every item shows action + "Why"
- [ ] Category rules visible per persona: Ioana -> meetings made async + breaks; Matei -> focus block + 1:1 dropped + first steps; Elena -> reduced notifications + 3 tasks + Slack drafts
- [ ] "Help me start" → `breakdownTask` first 5-minute step
### v1 (by H11)
- [ ] Google Calendar real (OAuth web client, calendar.readonly) behind `EXPO_PUBLIC_MOCK_CALENDAR=false`; fallback to mock on error
- [ ] Hard-day mode: drafted messages for moved meetings (copy button)
- [ ] Jira real via `jiraIssues` behind `EXPO_PUBLIC_MOCK_TASKS=false`
### Stretch
- [ ] Time blindness: progressive visual countdown before next meeting (30/10/2 min), no sound-only cues
- [ ] Protect the day: propose focus blocks + meeting grouping; write focus block to Google Calendar (calendar.events scope)
- [ ] Body doubling: a 25-minute "work with me" session with gentle check-ins every 10 minutes

## Acceptance
- Plan never contains events/tasks not in the input (server filters unknown refIds).
- Low capacity ⇒ movable meetings moved/async, breaks added, ends on time.
- If Gemini fails, the original schedule still shows with an alert message.
