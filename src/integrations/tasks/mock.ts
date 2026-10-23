// Owner: Alexandra. Demo Jira-like backlog. Primary: Ioana Popescu.
import type { WorkTask } from '@/src/shared/types';
import { getIoanaTasks } from '@/src/mocks/demoUser';

export const getMockTasks = (): WorkTask[] => getIoanaTasks();

export const setMockTaskPersona = (_p?: any) => {};
