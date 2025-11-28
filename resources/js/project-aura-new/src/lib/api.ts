// API client for communicating with Laravel backend

const API_BASE_URL = '/api';

export interface ApiResponse<T> {
	data: T;
	message?: string;
}

class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	private async request<T>(
		endpoint: string,
		options?: RequestInit
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		const config: RequestInit = {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				...options?.headers,
			},
		};

		try {
			const response = await fetch(url, config);

			if (!response.ok) {
				throw new Error(`API Error: ${response.statusText}`);
			}

			// Handle 204 No Content
			if (response.status === 204) {
				return null as T;
			}

			return await response.json();
		} catch (error) {
			console.error('API Request failed:', error);
			throw error;
		}
	}

	async get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET' });
	}

	async post<T>(endpoint: string, data: any): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: JSON.stringify(data),
		});
	}

	async put<T>(endpoint: string, data: any): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(data),
		});
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}
}

export const api = new ApiClient(API_BASE_URL);
