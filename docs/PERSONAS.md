# VibeCheck Target Personas (AccessABILITY Hackathon 2026)

This document preserves the context, challenges, and user profiles developed for VibeCheck. While the live application demo focuses on **Ioana Popescu** (chronic illness / endometriosis), the platform is architected for all three personas.

---

## 1. Ioana Popescu (Primary Demo Persona)
- **Role**: Junior Data Analyst (Retail Hub, 4 months into first job)
- **Age**: 26
- **Category**: Chronic Illness (Endometriosis, fluctuating chronic pain & fatigue)
- **Tracked Metrics**: `physical_energy` (1-10), `pain` (1-10), `brain_fog` (1-10)
- **Work arrangement**: Hybrid (remote/office), 09:00–17:30
- **Manager**: Andrei (Engineering / Analytics Manager)
- **Disclosure Level**: General ("Due to a health condition...")
- **Workplace Patterns**:
  - Predictable monthly flare cycles lasting 2–3 days (today is Day 1 of flare; previous flare occurred 4 weeks ago).
  - Mondays & Tuesdays have lower baseline energy, requiring pacing and scheduled rest breaks.
  - High pain / brain fog triggers "Adapt my day": moving or making group meetings async (e.g. Sprint Planning), adding 30-min pacing breaks, limiting focus to 2-3 essential tasks.
  - Generates professional, zero-stigma accommodation requests for remote flare days or async meetings without disclosing medical diagnosis.

---

## 2. Matei (Neurodivergent)
- **Role**: Junior QA Engineer
- **Category**: Neurodivergent (Autistic with ADHD)
- **Tracked Metrics**: `focus` (1-10), `sensory_load` (1-10), `social_battery` (1-10)
- **Disclosure Level**: Specific (open about autism/ADHD needs with lead)
- **Workplace Patterns & Needs**:
  - Meeting-heavy days (Tuesdays / Thursdays) cause high sensory overload and deplete social battery.
  - Sometimes non-speaking or experiences executive function freeze during group discussions.
  - Needs:
    - **AAC Communication Assistant**: generates pre-composed, calm, professional meeting inputs ("Spoken" for TTS, "Chat" for video calls).
    - **Help Me Start (Breakdown Task)**: breaks down daunting, blocked Jira tickets (e.g., blocked 6 days) into concrete 5-minute starter steps.
    - **Focus Block Protection**: reserves 60-90 minutes of continuous deep work without interruption.

---

## 3. Elena (Psychosocial / Burnout Prevention)
- **Role**: Junior Marketing Specialist
- **Category**: Psychosocial (Anxiety, early burnout symptoms)
- **Tracked Metrics**: `anxiety` (1-10), `overwhelm` (1-10)
- **Disclosure Level**: None ("For personal reasons...")
- **Workplace Patterns & Needs**:
  - Overwork pattern: worked past 20:00 on 5 of the last 7 workdays to compensate for anxiety.
  - Rising anxiety and cognitive overload over a 2-week period.
  - Needs:
    - **Overload Early Warning**: detects late-night working + consecutive low-capacity reports and flags an early-warning banner.
    - **Workload Redistribution Draft**: pre-drafts respectful requests to manager to redistribute non-urgent deadlines.
    - **Hard Day Mode**: reduces notifications to critical-only and simplifies the day to maximum 3 priority tasks.
