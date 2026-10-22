// Owner: Alexandra. Real Jira Cloud integration behind feature flag.
// Token stays on the server; client calls jiraIssues Cloud Function.
import { jiraIssues } from '@/src/shared/api';
import type { WorkTask } from '@/src/shared/types';
import type { TaskProvider } from './types';
import { getMockTasks } from './mock';

export const jiraTaskProvider: TaskProvider = {
  name: 'jira',
  async listTasks(): Promise<WorkTask[]> {
    try {
      return await jiraIssues({});
    } catch (err) {
      console.warn('Jira fetch failed or not configured, falling back to mock tasks:', err);
      return getMockTasks();
    }
  },
};