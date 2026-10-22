// Owner: Alexandra. Jira is called through the jiraIssues Cloud Function (token stays server-side, no CORS issues).
import { config } from '@/src/shared/config';
import { jiraIssues } from '@/src/shared/api';
import { getMockTasks } from './mock';
import type { WorkTask } from '@/src/shared/types';

export { setMockTaskPersona } from './mock';
export async function getTasks(): Promise<WorkTask[]> {
  if (config.mockTasks) return getMockTasks();
  try { return await jiraIssues({}); } catch { return getMockTasks(); } // fallback keeps the demo alive
}
