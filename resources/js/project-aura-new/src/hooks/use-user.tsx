import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/task';
import { api } from '@/lib/api';

interface UserContextType {
	currentUser: User | null;
	setCurrentUser: (user: User | null) => void;
	teamMembers: User[];
	isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setIsLoading(true);
				const users = await api.get<User[]>('/users');
				setTeamMembers(users);

				// Set the first user as the current user by default
				if (users.length > 0) {
					setCurrentUser(users[0]);
				}
			} catch (error) {
				console.error('Failed to fetch users:', error);
				// Fallback to localStorage if API fails
				const savedTeamMembers = localStorage.getItem("taskflow_team_members");
				if (savedTeamMembers) {
					try {
						const loadedMembers: User[] = JSON.parse(savedTeamMembers);
						setTeamMembers(loadedMembers);
						if (loadedMembers.length > 0) {
							setCurrentUser(loadedMembers[0]);
						}
					} catch (error) {
						console.error('Failed to parse localStorage users:', error);
					}
				}
			} finally {
				setIsLoading(false);
			}
		};

		fetchUsers();
	}, []);

	return (
		<UserContext.Provider value={{ currentUser, setCurrentUser, teamMembers, isLoading }}>
			{children}
		</UserContext.Provider>
	);
}

export function useUser() {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
}
