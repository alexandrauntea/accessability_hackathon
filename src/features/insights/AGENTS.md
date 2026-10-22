# Slice: Check-in & Insights — owner Andreea
Also owns: `src/features/insights/`, `functions/src/checkin/`, `src/shared/ui/`, `src/shared/theme/`, speech hooks.

## Contract you provide to others (do not break)
- `getTodayCheckin(): Promise<Checkin|null>`, `listCheckins(n)`, `deriveCapacity()` in `checkinRepo.ts`
- `computeStats(checkins, tracked): Stats`, `overloadSignal(stats)` in `insights/stats.ts`
- `METRICS`, `CATEGORY_DEFAULTS`, `deriveCapacity`, `CAPACITY_ANCHORS` in `src/shared/metrics.ts`
- `useFeedback().confirm()` (haptic + sound), `ScaleInput` (1-10 number buttons with anchors)

## Backlog
### MVP (by H6)
- [ ] UI kit polished + contrast verified (light, dark, high contrast, low-sensory)
- [ ] Check-in shows only the user's 2-3 metrics, saves, Daily Capacity derived, Today shows it — doable in 10 s
- [ ] Voice: "pain is 8 and I can't concentrate" -> `parseCheckin` -> scales pre-filled + "please confirm"
- [ ] Haptic + sound confirmation on save (test on phone with Expo Go), mute works
- [ ] `summarizeState` deployed; Today shows AI summary with AiBadge
- [ ] Demo tools: 3 personas seed correctly (Ioana Mon/Tue low capacity, Matei low social battery Tue/Thu, Elena rising anxiety + late nights)
### v1 (by H11)
- [ ] Insights: weekday chart + "last 7 vs previous 7" + sleep correlation, all values readable as text
- [ ] "Read aloud" on every screen; auto-read when pref enabled
- [ ] Voice dictation in notes (web Speech API), graceful when unsupported
- [ ] Keyboard pass: Tab reaches every number button, Space/Enter selects, focus ring visible in all themes
### Stretch
- [ ] Overload early-warning card on Today (uses `overloadSignal`) with button → Support (workload)
- [ ] Realistic duration estimate per task from history (estimate vs capacity)
- [ ] Customisable check-in: user picks which scales to show (by condition)

## Acceptance
- Keyboard-only: complete a check-in with Tab/Enter only.
- Screen reader (NVDA/VoiceOver on web): every scale announces "Pain: 3 out of 10".
- AI summary quotes real numbers from stats; nothing invented.
