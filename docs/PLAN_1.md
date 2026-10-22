# VibeCheck: felia Alexandrei (Day + Speak for me + Integrări), plan până la final

> Pune fișierul în repo la `src/features/day/PLAN.md` și începe fiecare sesiune de agent cu:
> „Citește AGENTS.md, src/features/day/AGENTS.md, src/features/aac/AGENTS.md și src/features/day/PLAN.md. Lucrez la task-ul T<n>.”

## 0. Contextul produsului (pentru agent)

VibeCheck este un asistent de lucru pentru adulți la primul job care trăiesc cu **dizabilități invizibile și fluctuante**:

- **boli cronice**, cu focus pe femei: endometrioză, fibromialgie, migrenă cronică, boli autoimune (lupus, Hashimoto, artrită reumatoidă), long COVID, ME/CFS (sindromul de oboseală cronică); secundar, boli cu fluctuații de energie, de exemplu scleroza multiplă;
- **neurodivergență**: ADHD, autism, dislexie;
- **dizabilități psihosociale**: anxietate, depresie, burnout.

Ziua începe cu un check-in de 10 secunde (2–3 metrici 1–10). Din el rezultă **Daily Capacity 1–10**: 1 = doar task-uri scurte asincrone, 5 = normal, 10 = flow complet. Pe baza capacității, a categoriei și a tiparelor din istoric, aplicația **adaptează ziua de lucru**: calendar + task-uri, cu un motiv pentru fiecare schimbare. Tot ea ajută în ședințe (Speak for me / AAC) și redactează cereri de adaptare către HR/manager. Cererile de adaptare sunt felia Alinei.

Accesibilitate by design: contrast ridicat, text lizibil (Atkinson Hyperlegible), TTS pe fiecare ecran, nimic doar audio, nimic transmis doar prin culoare, tastatură/voce, ținte ≥ 48px, limbaj adult și operațional, fără emoji. Responsible AI: niciun sfat medical, AI-ul explică de ce, statisticile se calculează în cod, datele trimise la LLM sunt minime.

**Obiectivul acestui plan:** aplicația trebuie să meargă pentru **orice utilizator nou**, nu doar pentru Ioana, Matei și Elena. Calendarul și task-urile rămân deocamdată pe mock, dar sunt structurate ca să putem conecta ulterior Google Calendar și Jira fără să schimbăm restul codului.

## 1. Ce e deja făcut

- `functions/src/lib/ai.ts`: `generateJson()` cu @google/genai, JSON mode, zod, 1 retry, HttpsError, `defineSecret('GEMINI_API_KEY')`.
- `functions/src/lib/auth.ts`: `requireAuth(req)`.
- `functions/src/day/planDay.ts`: filtrează `refId`-urile inexistente; `break`/`focus` fără refId; `reason` pe fiecare item; scenariile Ioana, Matei și Elena (inclusiv „It's a hard day”) trec de 3 ori la rând.
- `src/features/day/DayScreen.tsx`, `dayRepo.ts`: UI accesibil, AiBadge, `confirm()`, guard `Platform.OS` pentru Calendar.

## 2. Reguli stricte (fișiere)

**Ai voie să modifici:**
`src/features/day/**`, `src/features/aac/**`, `src/integrations/**`, `src/shared/firebase.ts`, `src/hooks/useAuth.tsx`,
`functions/src/day/**`, `functions/src/aac/**`, `functions/src/lib/ai.ts`, `functions/src/lib/auth.ts`.

**Ai voie doar să citești (import read-only):**
`getTodayCheckin`, `listCheckins` din `src/features/checkin/checkinRepo`, `computeStats` din `src/features/insights/stats`, `useProfile`, componentele din `src/shared/ui`, `useTheme`, `useFeedback`, `useSpeech`.

**NU modifica niciodată:** `src/features/checkin/**`, `src/features/insights/**`, `src/features/onboarding/**`, `src/features/advocate/**`, `src/features/settings/**`, `src/shared/ui/**`, `src/shared/theme/**`, `src/shared/metrics.ts`, `src/mocks/personas.ts`, `useProfile.ts`, `firestore.rules`, `functions/src/checkin/**`, `functions/src/advocate/**`, `functions/src/lib/safety.ts`.

**Contracte înghețate:** `src/shared/types.ts`, `src/shared/api.ts`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `functions/src/index.ts`. Le poți schimba doar printr-un **PR separat, mic, anunțat pe chat**, cu review de la o colegă. După ce modifici tipurile, rulezi `cd functions && npm run sync-types`. Nu edita niciodată de mână `functions/src/lib/types.ts`.
Dacă un task are nevoie de o schimbare de contract, agentul se **oprește** și descrie exact diff-ul propus.

**Reguli UI:** doar `src/shared/ui` (AppText, AppButton, Card, Screen, TextField, ChipGroup, SpeakButton, AiBadge); `accessibilityRole` + `accessibilityLabel` care conține valoarea; Tab + Space/Enter; `speakText` pe `<Screen>`; `<AiBadge why="…">` pe orice output AI; `useFeedback().confirm()` după fiecare acțiune salvată; erori cu `accessibilityRole="alert"` și text prietenos; fără drag, dropdown-uri sau acțiuni doar prin gest; animații doar dacă `useTheme().motion`; API-urile web-only păzite cu `Platform.OS`.

**Reguli AI:** spre Gemini trimiți doar capacitatea, categoria, valorile metricilor alese și titlurile și duratele evenimentelor/task-urilor. **Nu trimiți** numele diagnosticului, emailurile participanților sau note libere de sănătate. Răspunsul e JSON validat cu zod, iar orice ID inventat se elimină în cod. Fără sfaturi medicale. Fără log-uri cu conținut.

**Commit-uri:** convenționale, mici, pe branch-uri `feat/day-*` și `feat/aac-*` care trăiesc maximum 2 ore. Înainte de PR: `git pull --rebase origin main && npm run typecheck && (cd functions && npm run build)`, apoi un test pe web doar cu tastatura.

## 3. Timeline (de acum, 19:40)

| Ora | Task |
|---|---|
| 19:40–19:50 | T0 Fix typecheck (PR separat) |
| 19:50–20:45 | T1 Stratul de provideri + mock generic pentru orice utilizator |
| 20:45–21:15 | T2 planDay generic (fără persona) + re-adaptare când se schimbă capacitatea |
| 21:15–21:30 | **Checkpoint 1**: merge + deploy rules/functions/web, trimiți URL-ul |
| 21:30–22:30 | T3 Speak for me |
| 22:30–23:30 | T4 composeContribution |
| 23:30–00:30 | T5 Tiparele săptămânii (de ex. oboseală la început de săptămână) în My day |
| 00:30–01:45 | T6 Google Calendar real (read-only) cu fallback; T7 scheletul Jira |
| 01:45–02:00 | **Checkpoint 2**: deploy complet |
| 02:00–04:00 | T8 Protejarea zilei (deep work + gruparea ședințelor) |
| 04:00–06:00 | T9 Pregătirea ședinței |
| 06:00–07:00 | T10 QA de accesibilitate și test cu utilizator nou → **07:00 feature freeze** |
| 08:30 / 09:30 | Deploy final / video de rezervă (demo Matei pe telefon) |

Dormi 3 ore în rotație cu colegele. Dacă un task depășește timpul cu peste 30 de minute, îl tai și trec la următorul.

---

## T0: Fix typecheck în `app/(tabs)/_layout.tsx` (contract, PR separat)

Eroarea e la tipul prop-ului `color` din callback-ul `icon`. Schimbare minimă: `({ color }: { color: string })` (sau tipul pe care îl cere expo-router). Nu atinge nimic altceva.
**Gata când:** `npm run typecheck` trece în tot repo-ul. Commit: `fix(layout): type tab icon color`. Anunți pe chat și ceri review.

## T1: Stratul de provideri + mock generic

**De ce:** acum calendarul și task-urile există doar pentru cele 3 persona. Un utilizator nou trebuie să vadă o zi credibilă, iar codul trebuie să permită ulterior Google și Jira.

**Fișiere:**
- `src/integrations/types.ts`: interfețe locale feliei:
  ```ts
  export interface CalendarProvider { id: 'google' | 'persona-mock' | 'generic-mock'; listEvents(dateISO: string): Promise<CalendarEvent[]>; }
  export interface TaskProvider { id: 'jira' | 'persona-mock' | 'generic-mock'; listTasks(): Promise<WorkTask[]>; }
  ```
  `CalendarEvent` și `WorkTask` se refolosesc din `src/shared/types.ts` dacă există acolo. Dacă nu există, le definești aici, local.
- `src/integrations/calendar/genericMock.ts`, `src/integrations/tasks/genericMock.ts`: generator **determinist** (seed = uid + data), ca ziua să nu se schimbe la fiecare refresh. Folosește `profile.workHours` dacă există (implicit 09:00–17:00) și `profile.jobTitle`/rol dacă există. Dacă nu, folosește un set neutru pentru un junior în birou.
  - Calendar: 3–5 evenimente pe zi lucrătoare, dintre: daily stand-up 15 min, 1:1 cu managerul (marți), sprint planning 60 min (luni), team sync, coffee chat opțional, review/demo (vineri), training de onboarding. Fiecare are câmpurile `id`, `title`, `start`, `end`, `attendeesCount`, `optional: boolean`, `canBeAsync: boolean`.
  - Task-uri: 5–7 în stil Jira (`id` gen `VC-101`, `title`, `status` todo/in_progress/blocked, `estimateMin`, `priority`, `daysInStatus`, `description` scurt). Cel puțin unul blocat de peste 4 zile, pentru „Help me start”.
  - Variante de titluri după rol: data/analyst, QA/dev, marketing, generic.
- `src/integrations/index.ts`: `getCalendarProvider(profile)` și `getTaskProvider(profile)`. Ordinea de alegere:
  1. real (Google/Jira), dacă flag-ul `EXPO_PUBLIC_MOCK_CALENDAR`/`EXPO_PUBLIC_MOCK_TASKS` este `false` **și** utilizatorul e conectat;
  2. `persona-mock`, dacă `profile.demoPersona` există;
  3. `generic-mock`.
  Orice eroare a unui provider real face fallback silențios pe mock și setează `source` + `fallbackReason`, ca UI-ul să poată arăta „Using sample calendar”.
- `src/features/day/DayScreen.tsx`: textul sursei („Calendar: sample data” / „Google Calendar”), plus un card „Connect calendar” (dezactivat sau ascuns până la T6).

**Gata când:** un cont anonim nou, fără „Be …”, deschide My day și vede evenimente și task-uri. Refresh-ul arată aceeași zi. Persona funcționează ca înainte. `npm run typecheck` trece.
Commit-uri: `feat(integrations): provider interfaces and selector`, `feat(integrations): deterministic generic mock`.

## T2: planDay generic + re-adaptare

**De ce:** planDay trebuie să decidă după **categorie + capacitate + metrici**, nu după numele persona-ului.

**Fișiere:** `functions/src/day/planDay.ts`, `functions/src/day/rules.ts` (nou), `functions/src/day/prompt.ts` (nou, dacă nu există), `src/features/day/DayScreen.tsx`, `src/features/day/dayRepo.ts`.

1. Scoate din prompt și din cod orice referință la Ioana, Matei, Elena, QA-311 sau „sprint planning”. Persona rămân doar ca **teste**.
2. `rules.ts`: reguli deterministe calculate **înainte** de LLM și trimise în prompt ca restricții:
   - capacitate ≤ 3: maxim 3 task-uri; pauză de 10 min la fiecare 60–90 min; ședințele `optional` → `drop_today`; cele `canBeAsync` → `make_async` sau `reschedule`.
   - capacitate 4–6: maxim 5 task-uri; o pauză la 2 ore; un focus block.
   - capacitate ≥ 7: plan normal, focus block lung pentru task-ul cu prioritatea cea mai mare.
   - chronic: pauze mai dese dacă `pain` ≥ 7 sau `physical_energy` ≤ 3; ședințele lungi propuse cu camera oprită sau async; drafturi pentru „make it async”.
   - neurodivergent: focus block protejat; `firstStep` de 5 min pentru task-urile `blocked` sau cu `daysInStatus` ≥ 4; social_battery ≤ 3 → 1:1-urile neesențiale `drop_today`; sensory_load ≥ 7 → propune camera oprită.
   - psychosocial: „hard day” (buton sau capacitate ≤ 3) → `notificationLevel: 'reduced'`, maxim 3 task-uri mici și clare, drafturi de mesaje (`channel: 'slack'`), cât mai puține decizii.
   - fără categorie: doar regulile pe capacitate.
3. Validarea post-LLM rămâne: elimini refId-urile inexistente și aplici în cod limitele de task-uri (nu te bazezi pe model). Dacă LLM-ul cade: **fallback determinist** din `rules.ts` (plan fără text AI, cu badge „Rule-based”).
4. Nu există check-in azi: My day arată cardul „Start with a 10-second check-in” (navigare la ruta de check-in, fără import de componente) și butonul secundar „Plan with normal capacity (5/10)”, marcat clar în plan.
5. Re-adaptare: la focus pe ecran (`useFocusEffect`), recitești `getTodayCheckin()`. Dacă capacitatea diferă de cea din `dayPlans/{date}`, afișezi banner-ul „Your capacity changed from 6 to 3. Adapt my day again?”, cu label accesibil complet.
6. Teste: păstrezi testul pe 3 persona și adaugi 3 profiluri **random** (câte unul pe categorie, cu generic mock) plus cazurile limită: zi fără evenimente, 0 task-uri, categorie lipsă, capacitate 1 și 10.

**Gata când:** toate testele trec de 3 ori la rând, iar un utilizator nou cu check-in de capacitate 3 primește un plan corect, cu motive. Commit-uri: `refactor(day): category rules instead of persona prompts`, `feat(day): rule-based fallback plan`, `feat(day): re-adapt when capacity changes`.

## Checkpoint 1 (21:15)
`npm run deploy:rules && npm run deploy:functions && npm run deploy:web`. Pe URL-ul public: cont nou → onboarding → check-in → My day → Adapt; apoi „Be Matei”. Trimiți URL-ul pe chat.

## T3: Speak for me (`src/features/aac/`)

- Fraze rapide, fiecare un AppButton ≥ 48px cu label „Speak: <fraza>”: „I agree.”, „Can you repeat that, please?”, „I'll write my answer in the chat.”, „I need a 5-minute break.”, „Can we take this async?”, „I need a moment to think.”
- Fraze proprii: utilizatorul adaugă sau șterge fraze. Le salvezi local (try/catch) sau într-un câmp din profil doar dacă există deja în tipuri. Nu creezi colecții noi, pentru că ar cere schimbări în `firestore.rules`.
- Un TextField pentru contribuție plus butoanele „Speak” (expo-speech), „Stop speaking” și „Copy for the meeting chat” (expo-clipboard), urmate de `confirm()`.
- Pe web: Web Speech pentru TTS dacă expo-speech nu merge. Pe Expo Go: expo-speech.
- Gata când: merge pe web și pe telefon, doar cu tastatura, iar screen reader-ul citește fraza. Commit: `feat(aac): quick phrases with TTS and copy`.

## T4: composeContribution (`functions/src/aac/composeContribution.ts`)

- Moduri: `clarify` („Make it clear and professional”), `calm` (reformulare calmă a unei întrebări pentru manager, pentru anxietatea de comunicare), `status_update` („Build my status update from my tasks”, din task-urile providerului).
- Output: `{ text, why }`. Limită de 80 de cuvinte, ton adult, fără informații de sănătate dacă utilizatorul nu le-a scris explicit.
- În UI apar cu AiBadge, iar utilizatorul poate edita textul înainte de Speak sau Copy.
- Dacă funcția nu e exportată în `functions/src/index.ts` / `api.ts`, te oprești și ceri PR de contract.
- Gata când: 3 moduri × 3 inputuri dau texte bune. Commit: `feat(aac): compose contribution modes`.

## T5: Tiparele săptămânii în My day

**De ce:** de exemplu, persoana e predispusă la oboseală la început de săptămână. Statisticile sunt ale Andreei: le **citești** prin `computeStats(listCheckins())` și nu le recalculezi.

- În `src/features/day/weekPattern.ts`: din media capacității pe zile ale săptămânii, marchezi zilele cu medie ≤ media generală − 1,5 și minim 3 check-in-uri pe acea zi a săptămânii. Totul calculat în cod.
- Trimiți la planDay câmpul opțional `weekdayPattern: { todayIsUsuallyLow: boolean, avgToday: number, avgOverall: number }`. Regulă: dacă azi e de obicei o zi grea, chiar și la o capacitate declarată bună, nu pui ședințe lungi în primele 2 ore și propui un buffer.
- Card „Week ahead” (pe baza calendarului următoarelor 5 zile): „Mondays are usually your lowest day (avg 4.1 vs 6.3). Sprint planning is on Monday 10:00. Suggest moving it to Tuesday?”, cu buton „Draft a message”. Mesajul îl face composeContribution, modul `clarify`.
- Pentru cei cu sub 2 săptămâni de date: „Not enough data yet (need 2 weeks)”. Nu inventa tipare.
- Dacă `computeStats` nu expune mediile pe zile, ceri Andreei (vezi Note) și calculezi temporar în `weekPattern.ts` din `listCheckins()`.
- Commit: `feat(day): weekday capacity pattern in plan and week-ahead card`.

## T6: Google Calendar real (read-only, doar web)

- `src/integrations/calendar/google.ts`: `expo-auth-session` (web), scope `https://www.googleapis.com/auth/calendar.readonly`, `GET /calendar/v3/calendars/primary/events?timeMin&timeMax&singleEvents=true&orderBy=startTime`. Mapezi pe `CalendarEvent`: `optional` dacă utilizatorul are `responseStatus` `tentative` sau `needsAction`; `canBeAsync` după heuristici (fără `conferenceData`, ≥ 5 participanți etc.).
- Token-ul stă doar în memorie sau în sessionStorage, niciodată în Firestore sau Git.
- Setup: Google Cloud → Calendar API → OAuth client Web, cu origini = URL-ul de hosting și `http://localhost:8081`. `EXPO_PUBLIC_GOOGLE_CLIENT_ID` în `.env`, `EXPO_PUBLIC_MOCK_CALENDAR=false`.
- Cardul „Connect Google Calendar” din My day afișează starea („Connected · read-only” / „Using sample calendar because: …”). Pe telefon cardul e ascuns.
- Gata când: un cont Google de test își vede evenimentele, iar dacă revoci accesul, aplicația revine pe mock fără crash. Commit: `feat(integrations): google calendar read-only`.

## T7: Scheletul Jira (pregătit, rămâne pe mock)

- `functions/src/day/jiraIssues.ts`: callable care citește `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` din Secret Manager și face JQL `assignee = currentUser() AND statusCategory != Done`. Mapezi pe `WorkTask` (`daysInStatus` din `statuscategorychangedate`).
- `src/integrations/tasks/jira.ts`: implementează `TaskProvider` și apelează funcția prin `api.ts`.
- Implicit `EXPO_PUBLIC_MOCK_TASKS=true`. Fără secrete setate, funcția răspunde `failed-precondition`, iar providerul cade pe mock.
- Ținta nu e un demo Jira real, ci arhitectura gata pentru roadmap. Commit: `feat(integrations): jira provider behind flag`.

## Checkpoint 2 (01:45): deploy complet, test cont nou + 3 persona.

## T8 (stretch): Protejarea zilei

- În `rules.ts` + planDay: operația `group_meetings` propune mutarea ședințelor mutabile (`canBeAsync` sau fără conflicte) într-un singur interval, de exemplu 13:00–15:00. Operația `focus_block` blochează 90–120 min fără ședințe, dimineața sau după tiparul personal, dacă există.
- Fiecare propunere are un `reason` („3 context switches before lunch → grouped into 13:00–14:30”).
- În UI: „Protect my day” afișează diff-ul (înainte/după, ca text, nu doar prin culoare) și butoanele „Accept”/„Keep as is”.
- Scrierea în Google Calendar (scope `calendar.events`) **doar** după confirmare explicită și doar dacă rămâne timp. Altfel, propunerea rămâne în plan și pe roadmap.
- Commit: `feat(day): protect my day – focus blocks and grouped meetings`.

## T9 (stretch): Pregătirea ședinței

- Buton „Prepare” pe fiecare eveniment din My day. Noua funcție `functions/src/aac/prepareMeeting.ts` cere **PR de contract** pentru export.
- Input: titlu, descriere/agendă dacă există, durată, **numărul** participanților și rolurile, dacă sunt cunoscute (fără emailuri), plus task-urile relevante utilizatorului.
- Output: `{ purpose, likelyQuestions[3], myPoints[3], suggestedPhrases[3], why }`. Butonul „Add to Speak for me” adaugă frazele sugerate la frazele rapide.
- Pentru neurodivergenți sau anxietate: secțiunea „What to expect” (durată, cine vorbește de obicei, dacă e nevoie de cameră).
- Commit: `feat(aac): meeting prep`.

## T10: QA final (până la 07:00)

- Cont anonim **nou** pentru fiecare categorie: onboarding → check-in → My day → Adapt → Speak for me. Fără erori, fără ecrane goale.
- Doar tastatură pe My day și Speak for me; NVDA/VoiceOver citesc motivele planului; zoom 200%; text „Extra large”; low-sensory și high-contrast.
- Lighthouse ≥ 95 și axe fără erori critice pe My day și Speak for me.
- Fallback-uri: dezactivezi rețeaua sau secretul Gemini, iar planul rule-based apare cu mesaj prietenos.
- Grep pentru `Ioana|Matei|Elena|QA-311` în `functions/src/day` și `functions/src/aac`: apar doar în teste.
- Actualizezi `src/features/day/AGENTS.md` și `src/features/aac/AGENTS.md` cu ce s-a construit.

## Note și dependențe pentru colege (nu le implementa tu)

**Andreea (check-in / insights):**
- `getTodayCheckin()` trebuie să returneze `capacity` și metricile alese și pentru utilizatori fără `demoPersona`.
- Pentru T5 ar ajuta ca `computeStats` să expună `avgCapacityByWeekday` (0–6) și `countByWeekday`.
- Semnalul de suprasolicitare (lucru după 20:00 + capacitate scăzută) rămâne la ea. My day poate doar să afișeze link către Support dacă semnalul e activ.

**Alina (onboarding / profil / Support / reguli):**
- Profilul ar trebui să conțină `jobTitle`/`roleFamily` (data, qa/dev, marketing, other) și `workHours` pentru mock-ul generic. Dacă nu există, folosesc valori implicite.
- Butonul „Ask for an adjustment” din My day doar navighează la ruta ei, cu parametru (`/support?topic=workload` sau `topic=health`). Cererea, întrebările de clarificare și emailul rămân în felia ei.
- `firestore.rules`: nu am nevoie de colecții noi. Folosesc doar `dayPlans/{date}`.

**Contracte de anunțat pe chat (PR-uri separate):** T0 (layout), export `prepareMeeting` (T9), eventual tipurile `CalendarEvent`/`WorkTask` (`optional`, `canBeAsync`, `daysInStatus`) dacă lipsesc din `types.ts`, plus câmpul `weekdayPattern` din inputul planDay.
