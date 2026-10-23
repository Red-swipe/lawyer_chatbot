from typing import List, Dict


class ConversationMemory:
    """Manages conversational session memory using in-memory list storage."""

    def __init__(self) -> None:
        self._messages: List[Dict[str, str]] = []

    def add_message(self, role: str, content: str) -> None:
        """Adds a user or assistant message to memory."""
        self._messages.append({"role": role, "content": content})

    def get_history(self) -> List[Dict[str, str]]:
        """Returns a list of all messages as dicts: {"role": "...", "content": "..."}."""
        return list(self._messages)

    def clear(self) -> None:
        """Resets memory for a new chat session."""
        self._messages.clear()

    def get_context(self) -> str:
        """Returns a formatted string of the last 10 messages for LLM context."""
        recent_messages = self._messages[-10:]
        formatted_lines = [
            f"{msg['role'].capitalize()}: {msg['content']}"
            for msg in recent_messages
        ]
        return "\n".join(formatted_lines)
