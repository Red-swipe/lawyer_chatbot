import sys
import time
from memory import ConversationMemory
from chatbot import LawyerChatbot


def loading_animation(duration: float) -> None:
    frames = ["   ", ".  ", ".. ", "..."]
    end_time = time.time() + duration
    while time.time() < end_time:
        for frame in frames:
            sys.stdout.write(f"\r{frame}")
            sys.stdout.flush()
            time.sleep(0.2)
    sys.stdout.write("\r   \r")
    sys.stdout.flush()


def stream_print(text: str) -> None:
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(0.015)
    print()


def get_animation_duration(response_text: str) -> float:
    length = len(response_text)
    if length < 50:
        return 0.5
    elif length <= 150:
        return 1.0
    else:
        return 1.5


def main() -> None:
    # Ensure UTF-8 output handling on Windows consoles
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    print("Solon — AI Legal Assistant for Pakistan")
    print("Type 'exit' or 'quit' to end the conversation.\n")

    try:
        memory = ConversationMemory()
        chatbot = LawyerChatbot(memory=memory)
    except Exception as e:
        print(f"Error initializing chatbot: {e}")
        sys.exit(1)

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue

            if user_input.lower() in {"exit", "quit"}:
                break

            response = chatbot.process_input(user_input)
            duration = get_animation_duration(response)
            loading_animation(duration)
            stream_print(f"Solon: {response}")

        except (KeyboardInterrupt, EOFError):
            print()
            break
        except Exception as e:
            print(f"Solon: An error occurred: {e}. Please try again.")


if __name__ == "__main__":
    main()
