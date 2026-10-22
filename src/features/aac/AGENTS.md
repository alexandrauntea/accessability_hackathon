# Slice: Speak for me (AAC at work) — owner Alexandra
For autistic / non-speaking (always or under stress) users in meetings. No childish icons, no emojis.

- Route `app/speak.tsx` (optional param `meeting`). Entry points: Today ("Speak for me in a meeting"), My day (each event).
- `composeContribution` (functions/src/aac/) modes: `polish` (rewrite user's words, keep meaning, <= 3 sentences) and
  `status_update` (from open tasks; never includes health data or capacity unless the user typed it).
- Output: `spoken` (TTS) + `chat` (copy). Quick phrases speak instantly, offline.
- Meet/Teams: no chat API used. Audio via "share tab with audio" or speaker. Roadmap: Teams bot via Graph.

## Backlog
- [ ] MVP: quick phrases + TTS + copy (no AI needed) — by H6
- [ ] v1: polish + status update via AI, speech speed
- [ ] Stretch: "show large on screen" mode for in-person; saved personal phrases; prepare answers from meeting prep
