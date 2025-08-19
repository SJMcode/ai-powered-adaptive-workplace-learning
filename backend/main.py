from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
import httpx
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ----- Models matching the frontend -----


class ChatMessage(BaseModel):
    id: str
    content: str
    sender: str  # 'user' | 'ai'
    timestamp: str
    type: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str
    conversationId: str
    category: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    id: str
    content: str
    timestamp: str
    metadata: Dict[str, Any]
    suggestions: Optional[List[str]] = None
    codeExamples: Optional[List[Dict[str, Any]]] = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    lastMessage: str
    category: str
    messageCount: int
    createdAt: str
    updatedAt: str


# ----- Simple in-memory storage (non-persistent) -----


class InMemoryStore:
    def __init__(self) -> None:
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.messages: Dict[str, List[ChatMessage]] = {}

    def create_conversation(self, title: str, category: str) -> ConversationSummary:
        conversation_id = str(uuid.uuid4())
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        summary = ConversationSummary(
            id=conversation_id,
            title=title,
            lastMessage="",
            category=category,
            messageCount=0,
            createdAt=now_iso,
            updatedAt=now_iso,
        )
        self.conversations[conversation_id] = summary.model_dump()
        self.messages[conversation_id] = []
        return summary

    def add_message(self, conversation_id: str, message: ChatMessage) -> None:
        if conversation_id not in self.messages:
            self.messages[conversation_id] = []
        self.messages[conversation_id].append(message)
        # update summary
        summary = self.conversations.get(conversation_id)
        if summary:
            summary["lastMessage"] = message.content[:200]
            summary["messageCount"] = len(self.messages[conversation_id])
            summary["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    def list_conversations(self) -> List[ConversationSummary]:
        return [ConversationSummary(**c) for c in self.conversations.values()]

    def get_messages(self, conversation_id: str) -> List[ChatMessage]:
        return self.messages.get(conversation_id, [])

    def delete_conversation(self, conversation_id: str) -> None:
        self.conversations.pop(conversation_id, None)
        self.messages.pop(conversation_id, None)

    def search_conversations(self, query: str) -> List[ConversationSummary]:
        q = query.lower()
        results = []
        for c in self.conversations.values():
            if q in c["title"].lower() or q in c.get("lastMessage", "").lower():
                results.append(ConversationSummary(**c))
        return results


store = InMemoryStore()


# ----- App and middleware -----


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Open AI
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "openai/gpt-4o-mini"

# ----- Ollama helpers -----


OLLAMA_URL = "http://localhost:11434"
OLLAMA_CHAT_ENDPOINT = f"{OLLAMA_URL}/api/chat"
OLLAMA_TAGS_ENDPOINT = f"{OLLAMA_URL}/api/tags"
OLLAMA_MODEL = "llama3.1"


async def openrouter_chat(message: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {os.environ.get('OPENROUTER_API_KEY')}",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "model": OPENROUTER_MODEL,
        "messages": [
            *( [ {"role": "system", "content": system_prompt } ] if system_prompt else [] ),
            {"role": "user", "content": message},
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json()


async def ollama_chat(message: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "messages": [
            *( [ {"role": "system", "content": system_prompt } ] if system_prompt else [] ),
            {"role": "user", "content": message},
        ],
        "stream": False,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(OLLAMA_CHAT_ENDPOINT, json=payload)
        response.raise_for_status()
        return response.json()


async def ollama_models() -> List[str]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(OLLAMA_TAGS_ENDPOINT)
            resp.raise_for_status()
            data = resp.json()
            return [m.get("model") or m.get("name") for m in data.get("models", [])]
    except Exception:
        return []


# ----- Routes used by the frontend -----


@app.get("/api/health")
async def health() -> Dict[str, Any]:
    models = await ollama_models()
    status = "ok" if models else "ollama-unavailable"
    return {"status": status, "models": models}


@app.get("/api/conversations", response_model=List[ConversationSummary])
async def get_conversations() -> List[ConversationSummary]:
    return store.list_conversations()


class CreateConversationRequest(BaseModel):
    title: str
    category: str


@app.post("/api/conversations", response_model=ConversationSummary)
async def create_conversation(body: CreateConversationRequest) -> ConversationSummary:
    return store.create_conversation(body.title, body.category)


@app.get("/api/conversations/{conversation_id}/messages", response_model=List[ChatMessage])
async def get_conversation_messages(conversation_id: str) -> List[ChatMessage]:
    if conversation_id not in store.messages:
        print(f"Conversation {conversation_id} not found!")
    else:
        print(f"Returning {len(store.messages[conversation_id])} messages for {conversation_id}")
    return store.get_messages(conversation_id)


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str) -> Dict[str, str]:
    store.delete_conversation(conversation_id)
    return {"status": "deleted"}


@app.get("/api/conversations/search", response_model=List[ConversationSummary])
async def search_conversations(q: str) -> List[ConversationSummary]:
    if not q.strip():
        return store.list_conversations()
    return store.search_conversations(q)


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    start_time = time.time()

    # Ensure conversation exists
    if body.conversationId not in store.conversations:
        store.conversations[body.conversationId] = ConversationSummary(
            id=body.conversationId,
            title=f"Conversation {body.conversationId[:8]}",
            lastMessage="",
            category=body.category,
            messageCount=0,
            createdAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            updatedAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        ).model_dump()
        store.messages[body.conversationId] = []

    # Log user message
    user_msg = ChatMessage(
        id=f"user-{uuid.uuid4()}",
        content=body.message,
        sender="user",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        category=body.category,
    )
    store.add_message(body.conversationId, user_msg)

    system_prompt = None
    if body.context and body.context.get("codeSnippet"):
        system_prompt = "You are an expert AI coding assistant. Be concise and helpful."

    try:
        use_openrouter = body.context and body.context.get("use_openrouter")
        if use_openrouter:
            result = await openrouter_chat(body.message, system_prompt=system_prompt)
            content = result["choices"][0]["message"]["content"]
            model_name = result.get("model", OPENROUTER_MODEL)
            total_duration_ms = int((time.time() - start_time) * 1000)
        else:
            result = await ollama_chat(body.message, system_prompt=system_prompt)
            content = result.get("message", {}).get("content", "")
            model_name = result.get("model", OLLAMA_MODEL)
            total_duration_ms = int(result.get("total_duration", 0) / 1_000_000)

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail={
            "message": str(e),
            "code": "MODEL_PROVIDER_ERROR"
        })

    # Create AI message
    assistant_msg = ChatMessage(
        id=f"ai-{uuid.uuid4()}",
        content=content or "",
        sender="ai",
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        category=body.category,
        metadata={
            "model": model_name,
            "tokens": 0,
            "processingTime": total_duration_ms,
        },
    )

    store.add_message(body.conversationId, assistant_msg)

    response = ChatResponse(
        id=assistant_msg.id,
        content=assistant_msg.content,
        timestamp=assistant_msg.timestamp,
        metadata=assistant_msg.metadata or {},
    )
    return response


# Convenience root endpoint
@app.get("/")
async def root() -> Dict[str, str]:
    return {"message": "Backend is running. See /api/health"}


