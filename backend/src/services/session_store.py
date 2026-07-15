from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from src.schemas.chat import ChatMessage


@dataclass
class ChatSessionState:
    chat_id: str
    messages: list[dict[str, Any]] = field(default_factory=list)
    sandbox_context: Optional[Any] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def hydrate(self, history: list[ChatMessage]) -> None:
        if history:
            self.messages = [message.model_dump(exclude_none=True) for message in history]
            self.updated_at = datetime.utcnow()


@dataclass
class SubAgentExecutionState:
    session_name: str
    agent_name: str
    task: str
    status: str = "running"
    result: Optional[str] = None
    error: Optional[dict[str, Any]] = None
    events: list[dict[str, Any]] = field(default_factory=list)
    background_task: Optional[Any] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ChatSessionState] = {}
        self._sub_agent_sessions: dict[str, list[dict[str, Any]]] = {}
        self._sub_agent_execution_states: dict[str, SubAgentExecutionState] = {}

    def get_or_create(self, chat_id: str) -> ChatSessionState:
        if chat_id not in self._sessions:
            self._sessions[chat_id] = ChatSessionState(chat_id=chat_id)
        return self._sessions[chat_id]

    def upsert_history(self, chat_id: str, history: list[ChatMessage]) -> ChatSessionState:
        session = self.get_or_create(chat_id)
        session.hydrate(history)
        return session

    def get(self, chat_id: str) -> Optional[ChatSessionState]:
        return self._sessions.get(chat_id)

    def delete(self, chat_id: str) -> None:
        self._sessions.pop(chat_id, None)

    def get_sub_agent_messages(self, chat_id: str, session_name: str) -> list[dict[str, Any]]:
        key = f"{chat_id}:{session_name}"
        if key not in self._sub_agent_sessions:
            self._sub_agent_sessions[key] = []
        return self._sub_agent_sessions[key]

    def set_sub_agent_messages(self, chat_id: str, session_name: str, messages: list[dict[str, Any]]) -> None:
        key = f"{chat_id}:{session_name}"
        self._sub_agent_sessions[key] = messages

    def delete_sub_agent_session(self, chat_id: str, session_name: str) -> None:
        key = f"{chat_id}:{session_name}"
        self._sub_agent_sessions.pop(key, None)
        self._sub_agent_execution_states.pop(key, None)

    def start_sub_agent_execution(
        self,
        chat_id: str,
        session_name: str,
        *,
        agent_name: str,
        task: str,
        background_task: Optional[Any] = None,
    ) -> SubAgentExecutionState:
        key = f"{chat_id}:{session_name}"
        state = SubAgentExecutionState(
            session_name=session_name,
            agent_name=agent_name,
            task=task,
            status="running",
            background_task=background_task,
        )
        self._sub_agent_execution_states[key] = state
        return state

    def attach_sub_agent_task(self, chat_id: str, session_name: str, background_task: Any) -> None:
        state = self.get_sub_agent_execution(chat_id, session_name)
        if state is None:
            return
        state.background_task = background_task
        state.updated_at = datetime.utcnow()

    def append_sub_agent_event(self, chat_id: str, session_name: str, event_type: str, data: dict[str, Any]) -> None:
        state = self.get_sub_agent_execution(chat_id, session_name)
        if state is None:
            return
        state.events.append({"event": event_type, "data": data})
        state.updated_at = datetime.utcnow()

    def complete_sub_agent_execution(self, chat_id: str, session_name: str, result: str) -> None:
        state = self.get_sub_agent_execution(chat_id, session_name)
        if state is None:
            return
        state.status = "completed"
        state.result = result
        state.error = None
        state.updated_at = datetime.utcnow()

    def fail_sub_agent_execution(self, chat_id: str, session_name: str, error: dict[str, Any]) -> None:
        state = self.get_sub_agent_execution(chat_id, session_name)
        if state is None:
            return
        state.status = "error"
        state.error = error
        state.updated_at = datetime.utcnow()

    def get_sub_agent_execution(self, chat_id: str, session_name: str) -> Optional[SubAgentExecutionState]:
        key = f"{chat_id}:{session_name}"
        return self._sub_agent_execution_states.get(key)