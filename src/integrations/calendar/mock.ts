// Owner: Alexandra. Demo calendars, one per persona (see src/mocks/personas.ts).
import type { CalendarEvent } from '@/src/shared/types';
import type { PersonaId } from '@/src/mocks/personas';
import type { CalendarProvider } from './types';

let persona: PersonaId = 'ioana';
export const setMockPersona = (p?: PersonaId) => { if (p) persona = p; };

const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00`).toISOString();
type Row = [id: string, title: string, start: string, end: string, movable: boolean, attendees: string[], essential?: boolean];

const DATA: Record<PersonaId, Row[]> = {
  ioana: [
    ['ev1', 'Team stand-up', '09:30', '09:45', false, ['team']],
    ['ev2', 'Sprint planning', '10:00', '11:30', true, ['Radu (manager)', 'team']],
    ['ev3', '1:1 with Radu', '13:00', '13:30', true, ['Radu (manager)']],
    ['ev4', 'Data pipeline review', '14:00', '15:00', true, ['Mihai', 'Elena']],
    ['ev5', 'Onboarding training: SQL best practices', '16:00', '17:00', true, []],
  ],
  matei: [
    ['ev1', 'Daily stand-up (video)', '09:30', '09:45', false, ['QA team']],
    ['ev2', 'Bug triage', '10:00', '11:00', true, ['Ana (QA lead)', 'devs']],
    ['ev3', 'Coffee chat 1:1 with new joiner', '11:30', '12:00', true, ['Vlad'], false],
    ['ev4', 'Sprint retrospective', '14:00', '15:00', false, ['whole team']],
    ['ev5', 'Weekly 1:1 with Ana', '16:00', '16:30', true, ['Ana (QA lead)']],
  ],
  elena: [
    ['ev1', 'Marketing stand-up', '09:15', '09:30', false, ['team']],
    ['ev2', 'Campaign kick-off with agency', '10:00', '11:30', false, ['Agency', 'Ioan (manager)']],
    ['ev3', 'Content review', '12:00', '13:00', true, ['Ioan (manager)']],
    ['ev4', 'Social media sync', '14:00', '14:30', true, ['Dana']],
    ['ev5', 'Newsletter brainstorm', '15:00', '16:00', true, ['team']],
    ['ev6', 'Stakeholder update prep', '16:30', '17:30', true, []],
  ],
};

export const mockCalendar: CalendarProvider = {
  name: 'mock',
  async getEvents(date) {
    return DATA[persona].map(([id, title, s, e, movable, attendees]): CalendarEvent => ({
      id, title, start: at(date, s), end: at(date, e), movable, attendees, source: 'mock',
    }));
  },
};
