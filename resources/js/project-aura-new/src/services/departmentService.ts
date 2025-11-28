import { api } from './api';
import { Department } from '@/types/department';

export const departmentService = {
	getAll: async (): Promise<Department[]> => {
		const { data } = await api.get('/departments');
		return data;
	},

	getById: async (id: string): Promise<Department> => {
		const { data } = await api.get(`/departments/${id}`);
		return data;
	},

	create: async (department: Omit<Department, 'id'>): Promise<Department> => {
		const { data } = await api.post('/departments', department);
		return data;
	},

	update: async (id: string, updates: Partial<Department>): Promise<Department> => {
		const { data } = await api.put(`/departments/${id}`, updates);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await api.delete(`/departments/${id}`);
	},
};
