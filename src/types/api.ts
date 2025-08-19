export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'code' | 'file';
  category?: 'bug-fix' | 'learning' | 'general';
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  category: 'bug-fix' | 'learning' | 'general';
  context?: {
    codeSnippet?: string;
    errorMessage?: string;
    language?: string;
    framework?: string;
  };
}

export interface ChatResponse {
  id: string;
  content: string;
  timestamp: string;
  metadata: {
    model: string;
    tokens: number;
    processingTime: number;
    confidence?: number;
  };
  suggestions?: string[];
  codeExamples?: {
    language: string;
    code: string;
    explanation: string;
  }[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  category: 'bug-fix' | 'learning' | 'general';
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}