// Owner: Alexandra. Jira is called through the jiraIssues Cloud Function (token stays server-side, no CORS issues).
import { config } from '@/src/shared/config';
import { getMockTasks } from './mock';
import { jiraTaskProvider } from './jira';
import type { WorkTask } from '@/src/shared/types';
import type { TaskProvider } from './types';

export { setMockTaskPersona } from './mock';
export { jiraTaskProvider } from './jira';
export type { TaskProvider } from './types';

export const mockTaskProvider: TaskProvider = {
  name: 'mock',
  listTasks: async () => getMockTasks(),
};

export const getTaskProvider = (): TaskProvider =>
  !config.mockTasks ? jiraTaskProvider : mockTaskProvider;

export async function getTasks(): Promise<WorkTask[]> {
  const provider = getTaskProvider();
  return provider.listTasks();
}