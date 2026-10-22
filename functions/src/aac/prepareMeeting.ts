// Owner: Alexandra. Meeting preparation assistant for non-speaking, neurodivergent, or anxious employees.
// Generates clear expectations, likely questions, key points, and ready-to-voice AAC phrases.
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { generateJson, GEMINI_API_KEY } from '../lib/ai';
import { requireAuth, REGION } from '../lib/auth';
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

  let out: z.infer<typeof Out>;
  try {
    out = await generateJson({ system: SYSTEM, prompt, schema: Out, temperature: 0.3 });
  } catch (err: any) {
    logger.warn('AI unavailable for prepareMeeting, using deterministic briefing', { error: String(err?.message ?? err) });

    const isStandup = /stand-?up|daily|sync/i.test(meetingTitle);
    const isSprint = /sprint|planning|retro/i.test(meetingTitle);
    const isOneOnOne = /1:1|manager|lead/i.test(meetingTitle);

    if (isStandup) {
      out = {
        purpose: 'Provide quick visibility on what was completed, active priorities, and any blockers.',
        likelyQuestions: [
          'What did you work on yesterday?',
          'What is your main focus for today?',
          'Is anything blocking your progress?',
        ],
        myPoints: [
          tasks[0] ? `Progressing on ${tasks[0].title}.` : 'Current sprint tasks are progressing as planned.',
          tasks[1] ? `Next priority is ${tasks[1].title}.` : 'Ready to pick up the next priority item from the backlog.',
          'No external blockers at this moment; continuing on deliverables.',
        ],
        suggestedPhrases: [
          tasks[0] ? `I am currently working on ${tasks[0].title} and anticipate finishing it today.` : 'I am working on my scheduled tasks and on track for today.',
          'I prefer to post my detailed bullet points in the meeting chat.',
          'I will follow up in writing immediately after the stand-up.',
        ],
        whatToExpect: {
          duration: `${durationMin} minutes`,
          speakingExpectation: 'Short 1-2 minute turn when your name is called in round-robin order.',
          cameraRequired: false,
        },
        why: 'Prepares structured stand-up updates to prevent spontaneous speaking anxiety.',
      };
    } else if (isSprint) {
      out = {
        purpose: 'Review backlog scope, estimate upcoming effort, and agree on sprint deliverables.',
        likelyQuestions: [
          'Do you have capacity to take on this item?',
          'Are the requirements clear for your assigned tasks?',
          'Do you foresee dependencies on other teams?',
        ],
        myPoints: [
          'Reviewing ticket specifications to ensure acceptance criteria are complete.',
          'Focusing on realistic commitments that protect quality and focus time.',
          'Requesting asynchronous task review for complex requirements.',
        ],
        suggestedPhrases: [
          'The requirements look clear, and I estimate this will fit within my weekly allocation.',
          'I need a minute to review the ticket details before confirming the estimate.',
          'Could we document the agreed acceptance criteria directly in the ticket description?',
        ],
        whatToExpect: {
          duration: `${durationMin} minutes`,
          speakingExpectation: 'Participatory discussion while reviewing Jira tickets together on screen.',
          cameraRequired: false,
        },
        why: 'Clarifies planning questions ahead of time to eliminate cognitive overload during estimation.',
      };
    } else if (isOneOnOne) {
      out = {
        purpose: 'Align on weekly priorities, project trajectory, and feedback with your lead.',
        likelyQuestions: [
          'How is your workload feeling this week?',
          'What went well and where do you need extra support?',
          'Are there any process adjustments that would help you work better?',
        ],
        myPoints: [
          tasks[0] ? `Key milestone completed on ${tasks[0].title}.` : 'Key project milestones are on track.',
          'Highlighting protected focus blocks that enabled uninterrupted progress.',
          'Clarifying timeline expectations for upcoming sprint deliverables.',
        ],
        suggestedPhrases: [
          'I am making steady progress on my primary deliverables and feel aligned with the priorities.',
          'I would appreciate keeping our check-in format in writing where feasible.',
          'Let us review the remaining action items by the end of today.',
        ],
        whatToExpect: {
          duration: `${durationMin} minutes`,
          speakingExpectation: 'Collaborative, two-way conversational check-in.',
          cameraRequired: true,
        },
        why: 'Structures personal discussion points in advance to facilitate a calm, constructive conversation.',
      };
    } else {
      out = {
        purpose: `Review progress and coordinate next steps for ${meetingTitle}.`,
        likelyQuestions: [
          'Can you share an update on your current deliverables?',
          'Do you need input or approvals from anyone in the group?',
          'What are the next action items for your workstream?',
        ],
        myPoints: [
          tasks[0] ? `Current workstream focused on ${tasks[0].title}.` : 'Deliverables are progressing according to schedule.',
          'Confirming next handoff points with the team.',
          'Documenting key decisions in written minutes after the sync.',
        ],
        suggestedPhrases: [
          'I agree with the direction discussed and will proceed with implementation.',
          'I have posted my thoughts and relevant links in the meeting chat for reference.',
          'Please share any specific action items for me in writing so I can track them accurately.',
        ],
        whatToExpect: {
          duration: `${durationMin} minutes`,
          speakingExpectation: 'Group discussion with opportunities to contribute via voice or chat.',
          cameraRequired: false,
        },
        why: 'Anticipates key discussion themes to ensure confident and prepared workplace participation.',
      };
    }
  }

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
