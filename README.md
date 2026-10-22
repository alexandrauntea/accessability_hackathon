# VibeCheck — your workday, adapted to your capacity

AccessABILITY Hackathon 2026 · Team: Andreea, Alexandra, Alina

VibeCheck is an AI work assistant for people in their first job who live with **invisible, fluctuating disabilities**
(chronic illness such as endometriosis, fibromyalgia, chronic migraine, lupus, Hashimoto, RA, long COVID, ME/CFS, MS;
neurodivergence; anxiety, depression, burnout). In a 10-second check-in you rate 2-3 scales that matter to you (or say one sentence); VibeCheck turns them into one Daily Capacity score, adapts your workday and, when needed,
helps you ask for an adjustment.

## Deliverables (filled in by the team)
1. **Problem, users, solution** — see below.
2. **User need & validation** — `docs/VALIDATION.md`
3. **Accessibility by design** — `docs/ACCESSIBILITY.md`
4. **Responsible AI, privacy & safety** — `docs/RESPONSIBLE_AI.md`
5. **Pitch & demo** — `docs/PITCH.md` (deck link + demo video link)
6. **Next steps** — bottom of this file

### Problem
Symptoms change day to day; job schedules don't. In the first months of a first job people rarely ask for adjustments
(fear of stigma, not knowing what's "allowed", not knowing how to phrase it).

### Solution
1. 10-second check-in: 2-3 metrics chosen at onboarding per user group (chronic illness: physical energy, pain, brain fog; neurodivergence: focus, sensory load, social battery; psychosocial: anxiety, overwhelm). Voice: "pain is 8 and I can't concentrate" -> AI fills the scales, user confirms. Vibration + sound confirm.
2. Insights: patterns computed in code (e.g. fatigue higher on Mondays), explained by AI in plain language.
3. Adaptive day: calendar (Google) + tasks (Jira) re-planned by AI around today's capacity, with a reason for every change; "hard day" mode; 5-minute first step for stuck tasks.
4. Speak for me (AAC): quick phrases and AI-polished contributions read aloud in meetings and copied to the meeting chat.
5. Support requests: AI asks up to 3 clarifying questions, drafts a request to manager/HR respecting your disclosure level; you edit, confirm and send.

## Run it
```bash
npm install
npx expo install --fix          # aligns Expo package versions with the installed SDK
cp .env.example .env            # fill Firebase web config
npm run web                     # main demo
npx expo start                  # phone: scan the QR code with Expo Go

cd functions && npm install && cp .env.example .env
firebase functions:secrets:set GEMINI_API_KEY   # from Google AI Studio
for s in SMTP_USER SMTP_PASS JIRA_EMAIL JIRA_TOKEN; do echo none | firebase functions:secrets:set $s --data-file=-; done
cd .. && npm run deploy:rules && npm run deploy:functions
npm run deploy:web              # Firebase Hosting
```

## Demo personas (one account each: separate Chrome profile or phone)
Ioana (endometriosis + migraine, Junior Data Analyst) · Matei (autistic + ADHD, Junior QA Engineer) · Elena (anxiety + burnout, Junior Marketing Specialist).
In each account: Today -> Demo tools -> "Be <name>".

## Architecture
Expo web (React Native) → Firebase Auth (anonymous) + Firestore (owner-only rules) → Cloud Functions (callable, europe-west1) → Gemini.
Integrations through adapters, mock first: `src/integrations/calendar`, `src/integrations/tasks`, `functions/src/advocate/email.ts`.

## Next steps
- Pilot with 2 employers + 1 patient association; co-design sessions with users.
- Microsoft 365 / Outlook / Teams, Slack, Asana, Linear integrations; SSO.
- HR side: anonymised, aggregated adjustment insights (never individual health data).
- Native apps (iOS/Android) with on-device speech; wearables (sleep, HRV) with explicit consent.
- Secret Manager everywhere, DPIA, GDPR Art. 9 review, EU data residency, accessibility audit (WCAG 2.2 AA) by users.
- Business: B2B licence per employee for employers/HR platforms; free for individuals via NGO partnerships.
