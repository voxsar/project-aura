import { api } from './api';
import { Task } from '@/types/task';

function mapTask(raw: any): Task {
	return {
		id: String(raw.id),
		title: raw.title,
		description: raw.description ?? '',
		project: raw.project ? raw.project.name : '',
		projectId: raw.project ? raw.project.id : undefined,
		assignee: raw.assignee ? raw.assignee.name : '',
		dueDate: raw.due_date ?? '',
		userStatus: raw.user_status || 'pending',
		projectStage: raw.project_stage_id ? String(raw.project_stage_id) : undefined,
		priority: raw.priority || 'medium',
		createdAt: raw.created_at || new Date().toISOString(),
		tags: raw.tags || [],
		startDate: raw.start_date || undefined,
		attachments: raw.attachments?.map((a: any) => ({
			id: String(a.id),
			name: a.name || a.filename || 'file',
			url: a.url || a.path || '',
			type: 'file',
			uploadedAt: a.created_at || new Date().toISOString(),
		})) || [],
		isInSpecificStage: raw.is_in_specific_stage || false,
		revisionComment: raw.revision_comment || undefined,
		previousStage: raw.previous_stage_id ? String(raw.previous_stage_id) : undefined,
		originalAssignee: raw.original_assignee ? raw.original_assignee.name : undefined,
		completedAt: raw.completed_at || undefined,
		revisionHistory: raw.revision_histories?.map((r: any) => ({
			id: String(r.id),
			comment: r.comment,
			requestedBy: r.requested_by || '',
			requestedAt: r.requested_at || r.created_at || new Date().toISOString(),
			resolvedAt: r.resolved_at || undefined,
		})) || [],
	};
}

export const taskService = {
	getAll: async (filters?: {
		projectId?: string; // backend expects project_id
		assigneeId?: string; // backend expects assignee_id
		userStatus?: string; // backend expects user_status
		search?: string; // (not implemented backend yet)
	}): Promise<Task[]> => {
		const params: any = {};
		if (filters?.projectId) params.project_id = filters.projectId;
		if (filters?.assigneeId) params.assignee_id = filters.assigneeId;
		if (filters?.userStatus) params.user_status = filters.userStatus;
		const { data } = await api.get('/tasks', { params });
		return Array.isArray(data) ? data.map(mapTask) : [];
	},

	getById: async (id: string): Promise<Task> => {
		const { data } = await api.get(`/tasks/${id}`);
		return mapTask(data);
	},

	create: async (task: Omit<Task, 'id' | 'createdAt'> & { projectId?: number; assigneeId?: number; projectStageId?: number }): Promise<Task> => {
		// Map to backend payload
		const payload: any = {
			title: task.title,
			description: task.description,
			project_id: task.projectId,
			assignee_id: task.assigneeId,
			user_status: task.userStatus,
			project_stage_id: task.projectStageId,
			due_date: task.dueDate,
			priority: task.priority,
			tags: task.tags,
			start_date: task.startDate,
			is_in_specific_stage: task.isInSpecificStage,
			revision_comment: task.revisionComment,
		};
		const { data } = await api.post('/tasks', payload);
		return mapTask(data);
	},

	update: async (id: string, updates: Partial<Task> & { projectId?: number; assigneeId?: number; projectStageId?: number }): Promise<Task> => {
		const payload: any = {
			title: updates.title,
			description: updates.description,
			project_id: updates.projectId,
			assignee_id: updates.assigneeId,
			user_status: updates.userStatus,
			project_stage_id: updates.projectStageId,
			due_date: updates.dueDate,
			priority: updates.priority,
			tags: updates.tags,
			start_date: updates.startDate,
			is_in_specific_stage: updates.isInSpecificStage,
			revision_comment: updates.revisionComment,
			previous_stage_id: updates.previousStage,
			original_assignee_id: updates.originalAssignee,
			completed_at: updates.completedAt,
		};
		const { data } = await api.put(`/tasks/${id}`, payload);
		return mapTask(data);
	},

	delete: async (id: string): Promise<void> => {
		await api.delete(`/tasks/${id}`);
	},

	move: async (id: string, stageId: string): Promise<Task> => {
		const { data } = await api.put(`/tasks/${id}`, { project_stage_id: stageId });
		return mapTask(data);
	},
};
