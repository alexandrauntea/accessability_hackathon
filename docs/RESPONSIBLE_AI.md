# Responsible AI, privacy & safety

- **Data minimisation & consent**: health data stored only after explicit consent; users can download or delete everything (Me → Privacy).
- **Isolation**: all data under `users/{uid}`, Firestore rules owner-only; summaries/outbox written only by server.
- **Keys server-side**: Gemini, SMTP and Jira credentials live in Secret Manager, used only in Cloud Functions.
- **Grounding**: statistics are computed in code; the AI explains numbers it is given. Day plans may only reference real event/task ids (server filters the rest).
- **Validated output**: every AI response is JSON validated with zod; invalid output → retry once → friendly fallback.
- **Transparency**: every AI block shows "AI-generated · why · check before acting"; every plan change has a reason.
- **Human in the loop**: no email without the user editing/reviewing and ticking confirmation. The model never chooses recipients.
- **Disclosure control**: none / general / specific. Enforced in code (`enforceDisclosure`), not only in the prompt.
- **No medical advice**: guardrails in every system prompt; scope = work planning.
- **Crisis safeguard**: crisis language → safety message + resources, no drafting.
- **Logging**: functions never log user content.
- Known limits: anonymous auth (prototype), keyword-based crisis detection, Gemini Developer API (move to Vertex AI in EU region for production).
