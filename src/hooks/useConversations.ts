import { useState, useEffect, useCallback } from 'react';
import { apiService, ApiError } from '../services/api';
import { ConversationSummary } from '../types/api';

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load conversations');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (
    title: string,
    category: 'bug-fix' | 'learning' | 'general'
  ) => {
    try {
      const newConversation = await apiService.createConversation(title, category);
      setConversations(prev => [newConversation, ...prev]);
      return newConversation;
    } catch (err) {
      console.error('Failed to create conversation:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      }
      throw err;
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await apiService.deleteConversation(id);
      setConversations(prev => prev.filter(conv => conv.id !== id));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      }
    }
  }, []);

  const searchConversations = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadConversations();
      return;
    }

    try {
      setIsLoading(true);
      const results = await apiService.searchConversations(query);
      setConversations(results);
    } catch (err) {
      console.error('Failed to search conversations:', err);
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    isLoading,
    error,
    loadConversations,
    createConversation,
    deleteConversation,
    searchConversations,
  };
}