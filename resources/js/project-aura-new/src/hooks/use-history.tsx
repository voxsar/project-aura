
import { useState, useEffect, useCallback } from 'react';
import { HistoryEntry } from '../types/history';

const HISTORY_STORAGE_KEY = 'taskflow_history';

export const useHistory = (projectId?: string) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const allHistory: HistoryEntry[] = JSON.parse(storedHistory);
        if (projectId) {
          setHistory(allHistory.filter(entry => entry.projectId === projectId));
        } else {
          setHistory(allHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load history from localStorage', error);
    }
  }, [projectId]);

  const addHistoryEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    try {
      const newEntry: HistoryEntry = {
        ...entry,
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      const allHistory: HistoryEntry[] = storedHistory ? JSON.parse(storedHistory) : [];
      const updatedHistory = [...allHistory, newEntry];

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));

      if (projectId && entry.projectId === projectId) {
        setHistory(prev => [...prev, newEntry]);
      } else if (!projectId) {
        setHistory(prev => [...prev, newEntry]);
      }
    } catch (error) {
      console.error('Failed to save history to localStorage', error);
    }
  }, [projectId]);

  return { history, addHistoryEntry };
};
