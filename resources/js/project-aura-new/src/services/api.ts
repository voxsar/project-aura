import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://auraai.dev.artslabcreatives.com/api';

export const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
	},
	withCredentials: false,
});

// Request interceptor to add auth token if needed
api.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('auth_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			// Handle unauthorized - could redirect to login in the future
			localStorage.removeItem('auth_token');
		}
		return Promise.reject(error);
	}
);
