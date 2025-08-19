import { ChatRequest, ChatResponse, ConversationSummary, ChatMessage } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or parsing errors
      throw new ApiError(
        'Failed to connect to the AI service. Please check your connection.',
        'NETWORK_ERROR',
        error
      );
    }
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const res = await this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    // Normalize timestamp to Date for UI
    return {
      ...res,
      timestamp: res.timestamp,
    } as ChatResponse;
  }

  async getConversations(): Promise<ConversationSummary[]> {
    return this.request<ConversationSummary[]>('/api/conversations');
  }

  async getConversation(id: string): Promise<ChatMessage[]> {
    const raw = await this.request<ChatMessage[]>(`/api/conversations/${id}/messages`);
    // Ensure timestamps are Date instances for UI rendering
    return raw.map((m: any) => ({
      ...m,
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    }));
  }

  async createConversation(title: string, category: string): Promise<ConversationSummary> {
    return this.request<ConversationSummary>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title, category }),
    });
  }

  async deleteConversation(id: string): Promise<void> {
    return this.request<void>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  async searchConversations(query: string): Promise<ConversationSummary[]> {
    const params = new URLSearchParams({ q: query });
    return this.request<ConversationSummary[]>(`/api/conversations/search?${params}`);
  }

  // Health check for backend connectivity
  async healthCheck(): Promise<{ status: string; models: string[] }> {
    return this.request<{ status: string; models: string[] }>('/api/health');
  }
}

export const apiService = new ApiService();
// ApiError class is already exported above