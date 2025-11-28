import { api } from './api';
import { User } from '@/types/task';

export const userService = {
	getAll: async (): Promise<User[]> => {
		const { data } = await api.get('/users');
		return data;
	},

	getById: async (id: string): Promise<User> => {
		const { data } = await api.get(`/users/${id}`);
		return data;
	},

	getCurrentUser: async (): Promise<User> => {
		const { data } = await api.get('/users/me');
		return data;
	},

	create: async (user: Omit<User, 'id'>): Promise<User> => {
		const { data } = await api.post('/users', user);
		return data;
	},

	update: async (id: string, updates: Partial<User>): Promise<User> => {
		const { data } = await api.put(`/users/${id}`, updates);
		return data;
	},

	delete: async (id: string): Promise<void> => {
		await api.delete(`/users/${id}`);
	},
};
