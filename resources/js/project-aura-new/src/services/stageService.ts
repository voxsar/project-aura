import { api } from './api';
import { Stage } from '@/types/stage';

export const stageService = {
	getAll: async (): Promise<Stage[]> => {
		const { data } = await api.get('/stages');
		return data;
	},

	getById: async (id: string): Promise<Stage> => {
		const { data } = await api.get(`/stages/${id}`);
		return data;
	},

	getByProject: async (projectId: string): Promise<Stage[]> => {
		const { data } = await api.get(`/stages`, { params: { project_id: projectId } });
		return data;
	},

	create: async (stage: Omit<Stage, 'id'>): Promise<Stage> => {
		const { data } = await api.post('/stages', stage);
		return data;
	},

	update: async (id: string, updates: Partial<Stage>): Promise<Stage> => {
		const { data } = await api.put(`/stages/${id}`, updates);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await api.delete(`/stages/${id}`);
	},
};
