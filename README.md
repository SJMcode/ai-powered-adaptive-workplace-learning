# AI Workplace Assistant

A modern chat interface for workplace AI assistance, designed to help employees quickly resolve bugs, learn new concepts, and get instant support.

## Features

- **Real-time Chat**: Interactive chat interface with AI assistant
- **Conversation Management**: Create, search, and organize conversations
- **Code Support**: Syntax highlighting and code block rendering
- **Quick Actions**: Pre-defined templates for common workplace scenarios
- **Connection Status**: Real-time backend connectivity monitoring
- **Responsive Design**: Works on desktop and mobile devices

## Backend Integration

This frontend is designed to work with Ollama/CrewAI backends. The application expects the following API endpoints:

### Required API Endpoints

```
POST /api/chat
GET /api/conversations
GET /api/conversations/:id/messages
POST /api/conversations
DELETE /api/conversations/:id
GET /api/conversations/search?q=query
GET /api/health
```

### API Request/Response Format

#### Chat Request
```json
{
  "message": "string",
  "conversationId": "string",
  "category": "bug-fix" | "learning" | "general",
  "context": {
    "codeSnippet": "string",
    "errorMessage": "string",
    "language": "string",
    "framework": "string"
  }
}
```

#### Chat Response
```json
{
  "id": "string",
  "content": "string",
  "timestamp": "ISO string",
  "metadata": {
    "model": "string",
    "tokens": "number",
    "processingTime": "number",
    "confidence": "number"
  },
  "suggestions": ["string"],
  "codeExamples": [{
    "language": "string",
    "code": "string",
    "explanation": "string"
  }]
}
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your backend URL:
   ```
   VITE_API_URL=http://localhost:8000
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Backend Integration Guide

### Ollama Integration

Your backend should integrate with Ollama to provide AI responses. Example Python FastAPI backend structure:

```python
from fastapi import FastAPI
import ollama

app = FastAPI()

@app.post("/api/chat")
async def chat(request: ChatRequest):
    # Process the request with Ollama
    response = ollama.chat(
        model='llama2',  # or your preferred model
        messages=[{
            'role': 'user',
            'content': request.message
        }]
    )
    
    return ChatResponse(
        id=str(uuid.uuid4()),
        content=response['message']['content'],
        timestamp=datetime.now().isoformat(),
        metadata={
            "model": "llama2",
            "tokens": response.get('tokens', 0),
            "processingTime": response.get('total_duration', 0) // 1000000
        }
    )
```

### CrewAI Integration

For more complex workflows, integrate CrewAI agents:

```python
from crewai import Agent, Task, Crew

# Define specialized agents
debug_agent = Agent(
    role='Debug Specialist',
    goal='Help developers identify and fix bugs',
    backstory='Expert in debugging and error analysis'
)

learning_agent = Agent(
    role='Learning Assistant',
    goal='Help developers learn new concepts',
    backstory='Experienced teacher and mentor'
)

@app.post("/api/chat")
async def chat(request: ChatRequest):
    # Route to appropriate agent based on category
    if request.category == 'bug-fix':
        agent = debug_agent
    elif request.category == 'learning':
        agent = learning_agent
    else:
        agent = general_agent
    
    # Create and execute task
    task = Task(
        description=request.message,
        agent=agent
    )
    
    crew = Crew(agents=[agent], tasks=[task])
    result = crew.kickoff()
    
    return ChatResponse(
        id=str(uuid.uuid4()),
        content=result,
        timestamp=datetime.now().isoformat(),
        metadata={
            "model": agent.role,
            "processingTime": 1000  # Add actual timing
        }
    )
```

## Error Handling

The frontend includes comprehensive error handling for:
- Network connectivity issues
- API timeouts
- Invalid responses
- Backend unavailability

## Development

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting provider

3. Ensure your backend API is accessible from your production domain

4. Update environment variables for production API endpoints