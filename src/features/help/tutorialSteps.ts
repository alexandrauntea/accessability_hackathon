// Owner: Andreea. In-app tutorial content: 7 steps, plain language, zero emojis.
export interface TutorialStep {
  step: number;
  title: string;
  sentences: string[];
  tip?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    step: 1,
    title: 'Your 10-second check-in',
    sentences: [
      'Answer two to three questions with numbers from 1 to 10 each day.',
      'You can also say one sentence out loud and confirm your ratings.',
      'Check-in takes about 10 seconds and keeps your day aligned with your current capacity.',
    ],
  },
  {
    step: 2,
    title: 'Daily capacity',
    sentences: [
      'Your scales combine into one daily capacity number from 1 to 10.',
      'A score of 1 means only short asynchronous tasks from bed or the sofa.',
      'A score of 5 represents a normal working day with breaks, and 10 is full flow ready for complex meetings.',
    ],
  },
  {
    step: 3,
    title: 'Keyboard access: Tab and Enter',
    sentences: [
      'VibeCheck is fully usable with only a keyboard, with no mouse or touch screen required.',
      'Press Tab to move focus forward to the next button, scale, or field, and Shift + Tab to move backward.',
      'Press Space or Enter to select scale numbers, activate buttons, or close pop-up instructions.',
      'A high-contrast focus ring always shows which element is currently selected.',
    ],
  },
  {
    step: 4,
    title: 'Today and Insights',
    sentences: [
      'Track your day and see your capacity patterns over time.',
      'The app computes all numbers deterministically in code.',
      'AI only explains what the numbers mean, always marked with an AI badge.',
    ],
  },
  {
    step: 5,
    title: 'My day',
    sentences: [
      'Your daily plan adapts to your capacity, with a clear reason for every proposed change.',
      'Meetings can be shortened or made asynchronous, and break blocks are added when capacity is low.',
      'You decide what to accept and stay in full control.',
    ],
  },
  {
    step: 6,
    title: 'Speak for me',
    sentences: [
      'When speaking in meetings is difficult or stressful, use Speak for me.',
      'Tap a plain phrase to have it read aloud through text-to-speech.',
      'You can also polish your thoughts and copy them directly to the meeting chat.',
    ],
  },
  {
    step: 7,
    title: 'Support and privacy',
    sentences: [
      'The app drafts accommodation and adjustment requests when work feels overwhelming.',
      'Nothing is ever sent until you review and confirm it.',
      'Your employer only sees your single capacity number, and only in requests you send.',
      'You can download or permanently delete all your data at any time in Me.',
    ],
    tip: 'Accessibility tip: keyboard navigation works everywhere with Tab and Space or Enter. Every screen has a read-aloud button. Low-sensory mode and larger text are in Me.',
  },
];
