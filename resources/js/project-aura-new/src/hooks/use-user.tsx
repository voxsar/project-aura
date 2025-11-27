import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/task';

interface UserContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  teamMembers: User[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedTeamMembers = localStorage.getItem("taskflow_team_members");
    if (savedTeamMembers) {
      try {
        const loadedMembers: User[] = JSON.parse(savedTeamMembers);
        setTeamMembers(loadedMembers);
        // Set the first member as the current user by default
        if (loadedMembers.length > 0) {
          setCurrentUser(loadedMembers[0]);
        }
      } catch (error) { /* handle error */ }
    }
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, teamMembers }}>
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
