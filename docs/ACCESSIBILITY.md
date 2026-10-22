# Accessibility by design (WCAG 2.2 AA target, AAA contrast in high-contrast mode)

| Need | What VibeCheck does | Where |
|---|---|---|
| Blind / low vision | Semantic roles & labels on every control, heading levels, adjustable 0–10 scales, read-aloud (TTS) on every screen, auto-read option, text scale 100/125/150%, high-contrast theme (7:1) | `src/shared/ui`, `ThemeProvider` |
| Deaf / hard of hearing | No information conveyed only by sound; TTS is optional; all AI output is text first | everywhere |
| Motor (RA, tremor, fatigue) | 52px number buttons instead of sliders, 48px minimum everywhere, full keyboard (Tab + Space/Enter) with visible focus ring, voice check-in, "same as yesterday" | `AppButton`, `ScaleInput`, `CheckinScreen` |
| Vision (confirmation) | Vibration + discreet sound after saving (mutable); values announced by screen reader | `useFeedback` |
| Autism / sensory sensitivity | Low-sensory mode: aggressive dark, no animation, no saturated alert colours, square corners; operational questions; factual anchors, no emojis | `palettes.lowSensory`, `metrics.ts` |
| Non-speaking in meetings | Speak for me: quick phrases, AI-polished contribution, TTS + copy to meeting chat | `features/aac` |
| Cognitive / neurodivergent / brain fog | Plain language, optional "simple language" for AI, one main action per card, 5-minute first steps, no time limits, predictable layout, easy-read font (Atkinson Hyperlegible) | prefs in Me |
| Anxiety | Nothing sent without review; calm tone; drafts written for you | Support |

## Test checklist (run at each checkpoint)
- [ ] Lighthouse accessibility ≥ 95 on Today, My day, Support (Chrome DevTools)
- [ ] axe DevTools: 0 critical issues
- [ ] Keyboard only: do a check-in, adapt day, send a request
- [ ] Screen reader (NVDA on Windows / VoiceOver on Mac) reads the full check-in flow
- [ ] 200% browser zoom: no lost content
- [ ] High contrast + Extra large text: layout still works
