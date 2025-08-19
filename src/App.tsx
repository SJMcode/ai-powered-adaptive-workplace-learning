import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Search, 
  Plus, 
  MessageCircle, 
  Code, 
  Bug, 
  HelpCircle,
  Clock,
  User,
  Bot,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useChat } from './hooks/useChat';
import { useConversations } from './hooks/useConversations';
import { ConnectionStatus } from './components/ConnectionStatus';
import { CodeBlock } from './components/CodeBlock';
import { ApiError } from './services/api';
import { ChatMessage } from './types/api';

function App() {
  const [inputMessage, setInputMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'bug-fix' | 'learning' | 'general'>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
    createConversation,
    deleteConversation,
    searchConversations,
  } = useConversations();

  const {
    messages,
    isLoading: chatLoading,
    isConnected,
    sendMessage,
    loadConversation,
    clearMessages,
  } = useChat({
    conversationId: activeConversation || '',
    onError: (apiError: ApiError) => {
      setError(apiError.message);
      setTimeout(() => setError(null), 5000);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      loadConversation(activeConversation);
    }
  }, [activeConversation, loadConversation]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (!activeConversation) {
      // Create new conversation if none exists
      try {
        const newConv = await createConversation(
          inputMessage.slice(0, 50) + (inputMessage.length > 50 ? '...' : ''),
          selectedCategory
        );
        setActiveConversation(newConv.id);
      } catch (err) {
        setError('Failed to create conversation');
        return;
      }
    }

    const messageContent = inputMessage;
    setInputMessage('');

    // Extract context for better AI responses
    const context = extractContext(messageContent, selectedCategory);
    
    await sendMessage(messageContent, selectedCategory, context);
  };

  const extractContext = (message: string, category: string) => {
    const context: any = {};
    
    // Extract code snippets (basic detection)
    const codeMatch = message.match(/```(\w+)?\n([\s\S]*?)```/);
    if (codeMatch) {
      context.language = codeMatch[1] || 'javascript';
      context.codeSnippet = codeMatch[2];
    }
    
    // Extract error messages
    const errorMatch = message.match(/(error|exception|failed|undefined|null|cannot)/i);
    if (errorMatch && category === 'bug-fix') {
      context.errorMessage = message;
    }
    
    return Object.keys(context).length > 0 ? context : undefined;
  };

  const quickActions = [
    { icon: Bug, label: 'Debug Code', category: 'bug-fix' as const },
    { icon: Code, label: 'Code Review', category: 'learning' as const },
    { icon: HelpCircle, label: 'Ask Question', category: 'general' as const },
  ];

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    const templates = {
      'bug-fix': "I'm encountering a bug in my code. Here's the issue:",
      'learning': "I'd like to learn more about",
      'general': "I need help with"
    };
    
    setSelectedCategory(action.category);
    setInputMessage(templates[action.category] + " ");
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation('New Conversation', 'general');
      setActiveConversation(newConv.id);
      clearMessages();
    } catch (err) {
      setError('Failed to create new conversation');
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      if (activeConversation === id) {
        setActiveConversation(conversations.length > 1 ? conversations[0].id : null);
      }
    } catch (err) {
      setError('Failed to delete conversation');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchConversations(query);
  };

  const renderMessage = (message: ChatMessage) => {
    // Check if message contains code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: message.content.slice(lastIndex, match.index)
        });
      }
      
      // Add code block
      parts.push({
        type: 'code',
        language: match[1] || 'javascript',
        content: match[2]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < message.content.length) {
      parts.push({
        type: 'text',
        content: message.content.slice(lastIndex)
      });
    }
    
    // If no code blocks found, treat as plain text
    if (parts.length === 0) {
      parts.push({
        type: 'text',
        content: message.content
      });
    }

    return (
      <div>
        {parts.map((part, index) => (
          part.type === 'code' ? (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language}
            />
          ) : (
            <div key={index} className="whitespace-pre-wrap">
              {part.content}
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <Settings className="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors" />
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* New Conversation */}
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={handleNewConversation}
            disabled={conversationsLoading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 text-center text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet. Start a new one!
            </div>
          ) : (
            conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                activeConversation === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start gap-3 group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  conv.category === 'bug-fix' ? 'bg-red-100 text-red-600' :
                  conv.category === 'learning' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {conv.category === 'bug-fix' ? <Bug className="w-4 h-4" /> :
                   conv.category === 'learning' ? <Code className="w-4 h-4" /> :
                   <MessageCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{conv.title}</h3>
                  <p className="text-sm text-gray-500 truncate mt-1">{conv.lastMessage}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
          )}
          
          {conversationsError && (
            <div className="p-4 text-center text-red-500 text-sm">
              {conversationsError}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Workplace Assistant</h2>
              <p className="text-sm text-gray-500">Ready to help with bugs, learning, and general questions</p>
            </div>
            <ConnectionStatus 
              isConnected={isConnected} 
              isLoading={chatLoading}
              error={error}
            />
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeConversation ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Welcome to AI Assistant</p>
                <p>Start a new conversation or select an existing one to begin.</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Start the conversation</p>
                <p>Ask me anything about debugging, learning, or general help!</p>
              </div>
            </div>
          ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'ai' && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-2xl ${message.sender === 'user' ? 'order-2' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-200 rounded-tl-sm shadow-sm'
                }`}>
                  {renderMessage(message)}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 px-1">
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                  {message.metadata && (
                    <span className="text-gray-400">
                      • {message.metadata.model} • {message.metadata.processingTime}ms
                    </span>
                  )}
                </div>
              </div>

              {message.sender === 'user' && (
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 order-3">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
          )}
          
          {chatLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {activeConversation && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm ${
                  selectedCategory === action.category
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Input Area */}
        {activeConversation && (
          <div className="p-6 bg-white border-t border-gray-200">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message here... (Shift+Enter for new line)"
                  className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-50"
                  rows={3}
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || chatLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-w-[100px]"
            >
              {chatLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export default App;