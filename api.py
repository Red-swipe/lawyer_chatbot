from typing import Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from chatbot import LawyerChatbot
from memory import ConversationMemory
from law_retriever import LawRetriever

app = FastAPI(title="Solon Legal AI API")

# Enable CORS for all origins (React will run on a different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active sessions storage: session_id -> {"chatbot": LawyerChatbot, "memory": ConversationMemory}
sessions: Dict[str, Dict[str, Any]] = {}

# Shared law retriever for health checks
law_retriever = LawRetriever()


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    response: str
    session_id: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "law_db": law_retriever.is_available()}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> dict:
    session_id = request.session_id
    if session_id not in sessions:
        mem = ConversationMemory()
        bot = LawyerChatbot(memory=mem)
        sessions[session_id] = {"chatbot": bot, "memory": mem}

    session = sessions[session_id]
    response = session["chatbot"].process_input(request.message)
    return {"response": response, "session_id": session_id}


@app.delete("/session/{session_id}")
def delete_session(session_id: str) -> dict:
    sessions.pop(session_id, None)
    return {"cleared": True}
