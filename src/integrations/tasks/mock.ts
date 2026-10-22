// Owner: Alexandra. Demo Jira-like backlogs, one per persona.
import type { WorkTask } from '@/src/shared/types';
import type { PersonaId } from '@/src/mocks/personas';

let persona: PersonaId = 'ioana';
export const setMockTaskPersona = (p?: PersonaId) => { if (p) persona = p; };

const T = (id: string, title: string, status: WorkTask['status'], priority: WorkTask['priority'], estimateMin: number, extra: Partial<WorkTask> = {}): WorkTask =>
  ({ id, title, status, priority, estimateMin, source: 'mock', ...extra });

const DATA: Record<PersonaId, WorkTask[]> = {
  ioana: [
    T('DATA-142', 'Fix null values in customer churn dashboard', 'blocked', 'high', 120, { daysInStatus: 5, description: 'Empty rows for EU customers since the last ETL change.' }),
    T('DATA-150', 'Write SQL for monthly revenue report', 'in_progress', 'medium', 90),
    T('DATA-151', "Review Mihai's PR on data validation", 'todo', 'medium', 30),
    T('DATA-160', 'Prepare slides for Friday demo', 'todo', 'high', 90),
  ],
  matei: [
    T('QA-311', 'Write regression test plan for checkout v2', 'blocked', 'high', 240, { daysInStatus: 6, description: 'Large task: cover payment, coupons, guest checkout. No template yet.' }),
    T('QA-318', 'Reproduce login timeout bug on Android', 'in_progress', 'high', 60),
    T('QA-320', 'Update test data for staging', 'todo', 'medium', 45),
    T('QA-325', 'Automate smoke test for search', 'todo', 'low', 120),
  ],
  elena: [
    T('MKT-77', 'Draft Q4 newsletter', 'in_progress', 'high', 120, { daysInStatus: 4 }),
    T('MKT-81', 'Reply to agency feedback on banners', 'todo', 'high', 30),
    T('MKT-83', 'Schedule LinkedIn posts for next week', 'todo', 'medium', 45),
    T('MKT-85', 'Competitor analysis slides', 'todo', 'medium', 180),
    T('MKT-88', 'Clean up campaign tracking sheet', 'todo', 'low', 60),
  ],
};

export const getMockTasks = () => DATA[persona];
