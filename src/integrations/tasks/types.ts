// Owner: Alexandra. Task provider interface for mock & real (Jira) integrations.
import type { WorkTask } from '@/src/shared/types';

export interface TaskProvider {
  name: 'mock' | 'jira';
  listTasks(): Promise<WorkTask[]>;
}