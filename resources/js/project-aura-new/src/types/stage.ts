export type StageType = "user" | "project";

export interface Stage {
  id: string;
  title: string;
  color: string;
  order: number;
  type: StageType;
  mainResponsibleId?: string; // ID of the main responsible user
  backupResponsibleId1?: string; // ID of the first backup responsible user
  backupResponsibleId2?: string; // ID of the second backup responsible user
  isReviewStage?: boolean; // Whether this is a review stage
  linkedReviewStageId?: string; // ID of the review stage this stage links to (for non-review stages)
  approvedTargetStageId?: string; // ID of the stage to move to after approval (for review stages)
}

// User-level stages (always present, task lifecycle)
export const userStages: Stage[] = [
  { id: "pending", title: "Pending", color: "bg-status-todo", order: 0, type: "user" },
  { id: "in-progress", title: "In Progress", color: "bg-status-progress", order: 1, type: "user" },
  { id: "complete", title: "Complete", color: "bg-status-done", order: 2, type: "user" },
];

// Default project stages (for backward compatibility) - REMOVED
export const defaultStages: Stage[] = [];
