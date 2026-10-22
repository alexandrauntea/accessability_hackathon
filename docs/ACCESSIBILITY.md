# Accessibility by design (WCAG 2.2 AA target, AAA in high-contrast & low-sensory modes)

| Need | What VibeCheck does | Where implemented |
|---|---|---|
| **Blind / low vision** | Full semantic roles (`radio`, `radiogroup`, `checkbox`, `list`, `alert`), heading hierarchy (`aria-level`), 0–10 scale radio groups with factual anchors, read-aloud (TTS via Web Speech API) on every screen, auto-read aloud option, text scale 100/125/150%, and high-contrast theme ($>7:1$ AAA). | `src/shared/ui/`, `ThemeProvider`, `Screen` |
| **Deaf / hard of hearing** | No information is conveyed solely by audio. Audio confirmation chime is optional and mutable; all AI summaries, voice transcripts, and feedback are mirrored in visible, live-region text. | `useFeedback`, `CheckinScreen`, `TodayScreen` |
| **Motor (RA, tremor, fatigue)** | Large $52\times 52\text{px}$ radio buttons instead of sliders or dropdowns; minimum $48\times 48\text{px}$ touch targets across all buttons; full keyboard navigation (Tab + Space/Enter) with visible high-contrast focus rings; one-sentence voice check-in and "Same as yesterday" quick prefill. | `ScaleInput`, `AppButton`, `TextField`, `CheckinScreen` |
| **Vision (confirmation & feedback)** | Haptic vibration on mobile devices plus discreet audio chime on save (mutable in settings); capacity values and status changes announced politely via live regions. | `useFeedback`, `ScaleInput` |
| **Autism / sensory sensitivity** | Dedicated Low-Sensory mode: neutral dark background (`#0B0B0B`), zero bright saturated alert colors (reds/oranges replaced with calm neutral slate `#C8CDD3`), square brutalist corners (`radius = 0`), and complete animation suppression (`motion = false`); factual questions and anchors without emojis. | `palettes.lowSensory`, `metrics.ts`, `ThemeProvider` |
| **Non-speaking in meetings (AAC)** | "Speak for me": curated professional adult phrases, AI-adapted spoken contributions, instant text-to-speech reading, and one-tap clipboard copy for meeting chat. | `src/features/aac/` |
| **Cognitive / neurodivergent / brain fog** | Plain language summaries; optional "simple language" AI mode; 5-minute starter steps for task initiation; 10-second check-in workflow; Atkinson Hyperlegible dyslexia font; 14-day history gate preventing premature data overload. | `TodayScreen`, `InsightsScreen`, `SettingsScreen` |
| **Anxiety & Psychological safety** | Nothing is sent without review; calm non-judgmental tone; draft requests prepared with adjustable disclosure levels (none, general, specific); deterministic health data privacy. | `SupportScreen`, `RequestChatScreen` |

---

## Technical Specifications & WCAG 2.2 Conformance

### 1. Color & Contrast (WCAG 1.4.3, 1.4.6, 1.4.11)
- **Normal Themes (Light & Dark)**: Text contrast exceeds WCAG AA ($>4.5:1$). Focus indicators and interactive borders exceed $3:1$.
- **High-Contrast Theme**: Pure black (`#000000`) background with pure white (`#FFFFFF`) text ($21:1$), yellow primary (`#FFFF00`, $19.5:1$), and cyan focus outline (`#00FFFF`, $16.6:1$). Danger states exceed $7:1$ AAA (`#FF6B6B`, $7.56:1$).
- **Low-Sensory Theme**: Muted high-contrast palette with neutral dark background (`#0B0B0B`) and light slate text (`#D9D9D9`, $>14:1$). Removes jarring saturated red/orange hues entirely.
- **No Color Alone (WCAG 1.4.1)**: Lowest capacity weekday on Insights is explicitly labeled with text and a visible badge (`"lowest"`); scale inputs announce numerical values and anchors; chip options feature visible checkmarks (`✓`).

### 2. Keyboard & Operability (WCAG 2.1.1, 2.1.2, 2.4.7)
- Every interactive element has an accessible role, tab index, and key listeners for Space and Enter.
- 3px solid focus outline with 2px offset (`outlineColor: c.focus`) visible on web in all four themes.
- No keyboard traps; all modals and dialogs allow seamless tab progression and escape.

### 3. Text Scaling & Zoom (WCAG 1.4.4, 1.4.10)
- Supports user-selected 100%, 125%, and 150% text scaling via `ThemeProvider` tokens.
- Dynamic line height calculation (`lineHeight: size * 1.5`) ensures text never clips vertically.
- Flexible wrap containers ensure no horizontal overflow or truncation up to 200% browser zoom.

---

## Verification & QA Checklist
- [x] **TypeScript & Build**: `npm run typecheck` and `cd functions && npm run build` passing with 0 errors.
- [x] **Deterministic Stats & Personas**: `stats.test.ts` passes deterministically for Ioana (migraine cycle), Matei (meeting sensory peaks), and Elena (late-night overload warnings).
- [x] **Insights 14-Day Gate**: Accounts with $<14$ check-ins cleanly display `"Not enough data yet (need 2 weeks)"` instead of raw charts.
- [x] **Weekday Bar Charts**: Built entirely from semantic, accessible `View` components (no external chart libraries).
- [x] **Non-visual & Speech**: `speakText` summaries populated on every screen; Web Speech API integration verified.
- [ ] **Manual Device Testing (User)**: Full keyboard check-in in $<10$ seconds on web/mobile; NVDA / VoiceOver screen reader announcement check.
