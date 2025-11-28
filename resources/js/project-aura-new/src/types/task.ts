export type UserStatus = "pending" | "in-progress" | "complete";
export type TaskPriority = "low" | "medium" | "high";
export type UserRole = "user" | "team-lead" | "admin";

export interface TaskAttachment {
	id: string;
	name: string;
	url: string;
	type: "file" | "link";
	uploadedAt: string;
}

export interface RevisionHistory {
	id: string;
	comment: string;
	requestedBy: string; // Admin/Team Lead who requested revision
	requestedAt: string;
	resolvedAt?: string; // When user completed the revision
}

export interface Task {
	id: string;
	title: string;
	description: string;
	project: string; // project name (display)
	projectId?: number; // numeric project id from backend
	assignee: string;
	dueDate: string;
	userStatus: UserStatus; // User-level status: pending, in-progress, or complete
	projectStage?: string; // Project-specific stage ID (optional, for project views)
	priority: TaskPriority;
	createdAt: string;
	tags?: string[]; // Custom tags like Static, Reel, Carousel, Print, etc.
	startDate?: string; // Start date with time
	attachments?: TaskAttachment[]; // File uploads and external links
	isInSpecificStage?: boolean; // Whether task is in specific stage
	revisionComment?: string; // Current/latest revision comment
	revisionHistory?: RevisionHistory[]; // Array of all revision requests
	previousStage?: string; // Store the stage before moving to Review (for revision workflow)
	originalAssignee?: string; // Store the assignee who completed the task (for revision workflow)
	completedAt?: string; // ISO 8601 date string
}

export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	department: string; // Department ID
}
