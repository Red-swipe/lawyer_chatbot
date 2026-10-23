import os
import re
from typing import Optional
from groq import Groq

from memory import ConversationMemory
from api_integrations import (
    get_current_time,
    get_current_date,
    get_news,
    is_law_question,
)

DEFAULT_MODEL = "openai/gpt-oss-20b"
FALLBACK_MODEL = "openai/gpt-oss-20b"


def load_groq_api_key(path: Optional[str] = None) -> str:
    """Reads Groq API key from groq_api.txt or provided path."""
    candidates = [
        path,
        r"E:\A.G\lawyer_chatbot\groq_api.txt",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "groq_api.txt"),
        os.path.join(os.getcwd(), "groq_api.txt"),
    ]
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                key = f.read().strip()
                if key:
                    return key
    raise FileNotFoundError("Groq API key not found in groq_api.txt")


class LawyerChatbot:
    """Main chatbot class managing conversation memory, local routing, and Groq LLM integration."""

    def __init__(
        self,
        memory: Optional[ConversationMemory] = None,
        groq_key: Optional[str] = None,
        model: str = DEFAULT_MODEL,
    ) -> None:
        self.memory: ConversationMemory = memory if memory is not None else ConversationMemory()
        self.api_key: str = groq_key or load_groq_api_key()
        self.model: str = model
        self.client: Groq = Groq(api_key=self.api_key)

    def _is_greeting(self, text: str) -> bool:
        """Determines if the user input is a greeting."""
        cleaned = re.sub(r"[^\w\s]", "", text.strip().lower())
        greeting_phrases = {
            "hi",
            "hello",
            "hey",
            "how are you",
            "salam",
            "assalam o alaikum",
            "as-salamu alaykum",
        }
        if cleaned in greeting_phrases:
            return True
        tokens = cleaned.split()
        if tokens and tokens[0] in {"hi", "hello", "hey", "salam"} and len(tokens) <= 3:
            return True
        if "how are you" in cleaned and len(tokens) <= 5:
            return True
        return False

    def process_input(self, user_input: str) -> str:
        """Processes user input through local rules or Groq LLM and updates conversation memory."""
        # 1. Add user_input to memory
        self.memory.add_message("user", user_input)

        lowered = user_input.lower().strip()

        # 2. Check if it's a greeting -> respond locally, skip LLM
        if self._is_greeting(user_input):
            if "how are you" in lowered:
                response = "I'm doing well, thank you! How can I help?"
            else:
                response = "Hello! How can I help?"
            self.memory.add_message("assistant", response)
            return response

        # 3. Check if it's a time/date/news question -> use api_integrations.py, skip LLM
        if "time" in lowered and "date" in lowered:
            response = f"Today is {get_current_date()} and it's {get_current_time()}."
            self.memory.add_message("assistant", response)
            return response
        if "time" in lowered:
            response = f"It's {get_current_time()}"
            self.memory.add_message("assistant", response)
            return response
        if "date" in lowered:
            response = f"Today is {get_current_date()}"
            self.memory.add_message("assistant", response)
            return response
        if "news" in lowered:
            response = get_news("pakistan")
            self.memory.add_message("assistant", response)
            return response

        # 4. Check if it's a law question -> return law building disclaimer
        if is_law_question(user_input):
            response = "I don't have law knowledge yet, but I'm building it"
            self.memory.add_message("assistant", response)
            return response

        # 5. Otherwise -> send to Groq
        messages = [
            {"role": "system", "content": "You are a helpful Pakistani AI assistant."}
        ]
        messages.extend(self.memory.get_history())

        try:
            chat_completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
            )
            response = chat_completion.choices[0].message.content or ""
        except Exception as e:
            # Fall back if specified model is decommissioned or unavailable
            if "model_decommissioned" in str(e) or "does not exist" in str(e) or "model_not_found" in str(e):
                chat_completion = self.client.chat.completions.create(
                    model=FALLBACK_MODEL,
                    messages=messages,
                    temperature=0.7,
                )
                response = chat_completion.choices[0].message.content or ""
            else:
                raise e

        # Add response to memory
        self.memory.add_message("assistant", response)
        return response
