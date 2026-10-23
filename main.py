import sys
from memory import ConversationMemory
from chatbot import LawyerChatbot


def main() -> None:
    # Ensure UTF-8 output handling on Windows consoles
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except AttributeError:
            pass

    print("Pakistani Law Chatbot CLI")
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
            print(f"AI: {response}")

        except (KeyboardInterrupt, EOFError):
            print()
            break
        except Exception as e:
            print(f"AI: An error occurred: {e}. Please try again.")


if __name__ == "__main__":
    main()
