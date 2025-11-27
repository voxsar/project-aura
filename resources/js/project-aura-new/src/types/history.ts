
export type HistoryAction =
  // Task actions
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'UPDATE_TASK_STATUS'
  | 'UPDATE_TASK_ASSIGNEE'
  // Stage actions
  | 'CREATE_STAGE'
  | 'UPDATE_STAGE'
  | 'DELETE_STAGE'
  // Project actions
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'DELETE_PROJECT';

export type EntityType = 'task' | 'stage' | 'project';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: HistoryAction;
  entityId: string;
  entityType: EntityType;
  projectId: string;
  details: Record<string, unknown>;
}
