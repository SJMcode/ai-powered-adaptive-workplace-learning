import { useState, useCallback, useRef } from 'react';
import { apiService, ApiError } from '../services/api';
import { ChatMessage, ChatRequest } from '../types/api';

interface UseChatOptions {
  conversationId: string;
  onError?: (error: ApiError) => void;
}

export function useChat({ conversationId, onError }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    category: 'bug-fix' | 'learning' | 'general' = 'general',
    context?: ChatRequest['context']
  ) => {
    if (!content.trim() || isLoading) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date(),
      category,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const request: ChatRequest = {
        message: content,
        conversationId,
        category,
        context,
      };

      const response = await apiService.sendMessage(request);
      
      const aiMessage: ChatMessage = {
        id: response.id,
        content: response.content,
        sender: 'ai',
        timestamp: new Date(response.timestamp),
        category,
        metadata: response.metadata,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      if (error instanceof ApiError) {
        setIsConnected(error.code !== 'NETWORK_ERROR');
        onError?.(error);
        
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
          sender: 'ai',
          timestamp: new Date(),
          category: 'general',
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, isLoading, onError]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const conversationMessages = await apiService.getConversation(id);
      setMessages(conversationMessages);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      if (error instanceof ApiError) {
        setIsConnected(error.code !== 'NETWORK_ERROR');
        onError?.(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    isConnected,
    sendMessage,
    loadConversation,
    clearMessages,
  };
}