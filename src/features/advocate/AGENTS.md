# Slice: Support requests, Onboarding & Profile — owner Alina
Also owns: `src/features/onboarding/`, `src/features/settings/`, `useProfile.ts`, `firestore.rules`, `functions/src/advocate/`, `functions/src/lib/safety.ts`, pitch lead.

## Backlog
### MVP (by H6)
- [ ] Onboarding (4 steps): consent -> name + categories -> pick 2-3 metrics -> a11y/low-sensory/haptics/sound -> `onboarded: true`
- [ ] Me screen: name, manager/HR email, consent, disclosure level, a11y prefs (persisted)
- [ ] Support → category → `advocateChat` asks ≤3 clarifying questions → draft
- [ ] Draft is editable, confirmation checkbox, `sendRequest` writes to outbox (mock)
### v1 (by H11)
- [ ] Real email: `EMAIL_MODE=smtp` + Gmail app password secrets; recipients only from profile
- [ ] Email mentions only Daily Capacity (x/10), never individual metrics
- [ ] Disclosure guard verified (condition names stripped unless "specific")
- [ ] Crisis keywords → safety card, no drafting

- [ ] Export my data / delete my data work
### Stretch
- [ ] Message decoder (exists in UI; tune prompt, add context field)
- [ ] Rehearse a question for my manager: user types/dictates, AI rewrites calmer & clearer, offers 2 versions
- [ ] Meeting prep: from a calendar event → who attends, agenda, likely questions (uses Alexandra's `getCalendar()` read-only)
- [ ] Workload request pre-filled from overload signal (Andreea's `overloadSignal`)

## Acceptance
- No email leaves without the user ticking confirmation and pressing Send.
- The model never chooses recipients; `to` comes from profile.
- With disclosure "none", the email contains no health words.
