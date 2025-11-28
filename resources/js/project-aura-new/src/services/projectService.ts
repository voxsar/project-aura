import { api } from './api';
import { Project } from '@/types/project';
import { Stage } from '@/types/stage';

// Map backend stage (snake_case) to frontend Stage interface
function mapStage(raw: any): Stage {
	return {
		id: String(raw.id),
		title: raw.title,
		color: raw.color || 'bg-status-todo',
		order: raw.order ?? 0,
		type: (raw.type === 'user' || raw.type === 'project') ? raw.type : 'project',
		mainResponsibleId: raw.main_responsible_id ? String(raw.main_responsible_id) : undefined,
		backupResponsibleId1: raw.backup_responsible_id_1 ? String(raw.backup_responsible_id_1) : undefined,
		backupResponsibleId2: raw.backup_responsible_id_2 ? String(raw.backup_responsible_id_2) : undefined,
		isReviewStage: raw.is_review_stage ?? false,
		linkedReviewStageId: raw.linked_review_stage_id ? String(raw.linked_review_stage_id) : undefined,
		approvedTargetStageId: raw.approved_target_stage_id ? String(raw.approved_target_stage_id) : undefined,
	};
}

function mapProject(raw: any): Project {
	return {
		id: raw.id,
		name: raw.name,
		description: raw.description ?? '',
		createdAt: raw.created_at,
		stages: Array.isArray(raw.stages) ? raw.stages.map(mapStage) : [],
		department: raw.department ? { id: String(raw.department.id), name: raw.department.name } : undefined,
		emails: raw.emails || [],
		phoneNumbers: raw.phone_numbers || [],
	};
}

export const projectService = {
	getAll: async (): Promise<Project[]> => {
		const { data } = await api.get('/projects');
		// Axios returns response.data already via interceptor; but our api instance returns {data:..}
		const raw = data || data === 0 ? data : data; // defensive
		return Array.isArray(raw) ? raw.map(mapProject) : [];
	},

	getById: async (id: string): Promise<Project> => {
		const { data } = await api.get(`/projects/${id}`);
		return mapProject(data);
	},

	getByName: async (name: string): Promise<Project | null> => {
		const projects = await projectService.getAll();
		return projects.find(p => p.name === name) || null;
	},

	create: async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
		// Backend expects department_id not nested object
		const payload: any = {
			name: project.name,
			description: project.description,
			department_id: project.department ? project.department.id : "ss",
			emails: project.emails,
			phone_numbers: project.phoneNumbers,
		};
		const { data } = await api.post('/projects', payload);
		return mapProject(data);
	},

	update: async (id: string, updates: Partial<Project>): Promise<Project> => {
		const payload: any = {
			name: updates.name,
			description: updates.description,
			department_id: updates.department ? updates.department.id : undefined,
			emails: updates.emails,
			phone_numbers: updates.phoneNumbers,
		};
		const { data } = await api.put(`/projects/${id}`, payload);
		return mapProject(data);
	},

	delete: async (id: string): Promise<void> => {
		await api.delete(`/projects/${id}`);
	},
};
