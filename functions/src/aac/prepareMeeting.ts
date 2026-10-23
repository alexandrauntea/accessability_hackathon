// Owner: Alexandra. Generates a structured meeting preparation briefing.
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
import { prepareMeetingFallback } from '../lib/aiFallbacks';
import type { MeetingPrep } from '../lib/types';

const Out = z.object({
  purpose: z.string(),
  likelyQuestions: z.array(z.string()).max(3),
  myPoints: z.array(z.string()).max(3),
  suggestedPhrases: z.array(z.string()).max(3),
  whatToExpect: z.object({
    duration: z.string(),
    speakingExpectation: z.string(),
    cameraRequired: z.boolean(),
  }),
  why: z.string(),
});

const SYSTEM = `You prepare a workplace meeting briefing for an employee who communicates in writing or experiences anxiety / cognitive overload under pressure.
Tone: adult, calm, professional, concise, zero emojis, zero condescension.

Output requirements:
1. 'purpose': 1 clear sentence stating the core objective of the meeting.
2. 'likelyQuestions': Exactly 3 likely questions colleagues or managers might ask the user.
3. 'myPoints': Exactly 3 bullet points the user can present regarding their work and tasks.
4. 'suggestedPhrases': Exactly 3 first-person, professional phrases (<= 25 words each) ready for text-to-speech or meeting chat.
5. 'whatToExpect': { duration: string (e.g. "15 minutes" or "60 minutes"), speakingExpectation: string (e.g. "Brief 1-minute turn round-robin" or "Active discussion"), cameraRequired: boolean }.
6. 'why': 1 brief explanation of how this preparation reduces ambiguity and social anxiety.

Strict constraints:
- Never disclose medical conditions, capacity scores, or health details.
- Stay strictly grounded in the meeting title, duration, and task titles provided.`;

export const prepareMeeting = onCall({ region: REGION, secrets: [GEMINI_API_KEY] }, async (req) => {
  requireAuth(req);
  const { meetingTitle = 'Workplace Sync', durationMin = 30, attendeesCount = 3, tasks = [] } = (req.data ?? {}) as {
    meetingTitle: string;
    durationMin?: number;
    attendeesCount?: number;
    tasks?: { id: string; title: string }[];
  };

  const prompt = `Meeting Title: "${meetingTitle}"
Duration: ${durationMin} minutes
Estimated attendees: ${attendeesCount}
Active tasks: ${JSON.stringify(tasks.slice(0, 5))}
Return JSON matching schema.`;

  const out = await generateJson({
    fnName: 'prepareMeeting',
    system: SYSTEM,
    prompt,
    schema: Out,
    temperature: 0.3,
    fallback: () => prepareMeetingFallback({ meetingTitle, durationMin, attendeesCount, tasks }),
  });

  const result: MeetingPrep = {
    purpose: out.purpose,
    likelyQuestions: out.likelyQuestions.slice(0, 3),
    myPoints: out.myPoints.slice(0, 3),
    suggestedPhrases: out.suggestedPhrases.slice(0, 3),
    whatToExpect: out.whatToExpect,
    why: out.why,
  };

  return result;
});
