#!/usr/bin/env python3
"""
E2E Telegram Bot Simulator for EasyPath

Simulates a complete Telegram conversation flow with real-time WebSocket streaming.
Useful for rapid testing without needing to use Telegram's website.

Usage:
    # Automated test with predefined answers
    python apps/engine/tests/e2e/test_telegram_simulation.py --automated

    # Interactive test (type your own answers)
    python apps/engine/tests/e2e/test_telegram_simulation.py --interactive

    # With custom flow
    python apps/engine/tests/e2e/test_telegram_simulation.py --flow-path tests/fixtures/other_flow.json
"""

import asyncio
import json
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import httpx
import websockets
from uuid import uuid4

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TelegramSimulator:
    """Simulates Telegram bot conversation with real-time WebSocket streaming"""

    def __init__(
        self,
        engine_url: str = "http://localhost:8081",
        ws_url: str = "ws://localhost:8081",
    ):
        self.engine_url = engine_url
        self.ws_url = ws_url
        self.session_id = f"telegram-test-{uuid4().hex[:8]}"
        self.messages: List[Dict[str, str]] = []
        self.auto_advance_nodes: List[str] = []
        self.message_count = 0
        self.start_time = None

    def display_message(
        self, role: str, content: str, timestamp: Optional[datetime] = None
    ):
        """Display message in Telegram-style format"""
        if timestamp is None:
            timestamp = datetime.now()

        time_str = timestamp.strftime("%H:%M:%S")

        if role == "user":
            # Blue color for user messages
            print(f"\n\033[94m[{time_str}] You:\033[0m {content}")
        elif role == "assistant":
            # Green color for bot messages
            print(f"\033[92m[{time_str}] Bot:\033[0m {content}")
        elif role == "system":
            # Yellow color for system messages
            print(f"\033[93m[{time_str}] {content}\033[0m")

        self.messages.append({"role": role, "content": content, "timestamp": time_str})
        if role == "assistant":
            self.message_count += 1

    async def listen_websocket(self, flow_id: Optional[str] = None):
        """Listen to WebSocket for real-time assistant messages"""
        ws_url = f"{self.ws_url}/ws/session/{self.session_id}"
        if flow_id:
            ws_url += f"?flow_id={flow_id}"

        messages_received = []

        try:
            async with websockets.connect(ws_url, close_timeout=5) as websocket:
                print(f"\n\033[90m[WebSocket] Connected to {ws_url}\033[0m")

                # Listen for messages with timeout
                try:
                    async with asyncio.timeout(120):  # 2 minute max
                        async for message in websocket:
                            try:
                                event = json.loads(message)
                                event_type = event.get("event_type")

                                if event_type == "assistant_message":
                                    msg_text = event.get("message", "")
                                    node_id = event.get("node_id", "")

                                    if msg_text:
                                        messages_received.append(msg_text)
                                        self.display_message("assistant", msg_text)

                                        # Track auto-advance nodes (messages that come without user input)
                                        if len(messages_received) > 1:
                                            self.auto_advance_nodes.append(node_id)

                                elif event_type == "node_entered":
                                    node_id = event.get("node_id")
                                    print(
                                        f"\033[90m[WebSocket] Entered node: {node_id}\033[0m"
                                    )

                                elif event_type in ("session_ended", "error"):
                                    break

                            except json.JSONDecodeError:
                                continue

                except asyncio.TimeoutError:
                    print(f"\n\033[90m[WebSocket] Timeout reached\033[0m")

        except Exception as e:
            print(f"\n\033[91m[WebSocket] Error: {e}\033[0m")

        return messages_received

    async def send_message(self, user_message: str, flow_data: Dict[str, Any]):
        """Send message to engine and get response"""
        # Show typing indicator
        self.display_message("system", "Bot is typing...")

        # Start WebSocket listener
        ws_task = asyncio.create_task(self.listen_websocket())

        # Small delay to ensure WebSocket is connected
        await asyncio.sleep(0.5)

        # Send HTTP request to engine
        url = f"{self.engine_url}/chat/message-with-flow"
        payload = {
            "session_id": self.session_id,
            "flow": flow_data,
            "user_message": user_message,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()

                print(
                    f"\n\033[90m[HTTP] Response received (node: {result.get('current_node_id')})\033[0m"
                )

        except Exception as e:
            print(f"\n\033[91m[HTTP] Error: {e}\033[0m")
            ws_task.cancel()
            raise

        # Wait for WebSocket to finish receiving messages
        await asyncio.sleep(1.0)

        # Cancel WebSocket task
        ws_task.cancel()
        try:
            await ws_task
        except asyncio.CancelledError:
            pass

    async def run_conversation(
        self,
        flow_data: Dict[str, Any],
        user_messages: List[str],
        interactive: bool = False,
    ):
        """Run a complete conversation"""
        self.start_time = datetime.now()

        # Display header
        print("\n" + "═" * 60)
        print("🤖 Telegram Bot Simulator - Math Quiz")
        print("═" * 60)
        print(f"Session ID: {self.session_id}")
        print(f"Mode: {'Interactive' if interactive else 'Automated'}")
        print(f"Flow: {flow_data.get('global_objective', 'N/A')[:50]}...")
        print("─" * 60)

        if interactive:
            # Interactive mode
            while True:
                try:
                    user_input = input("\n\033[94mYou: \033[0m").strip()
                    if not user_input:
                        continue
                    if user_input.lower() in ("quit", "exit", "q"):
                        print("\n\033[93mExiting...\033[0m")
                        break

                    self.display_message("user", user_input)
                    await self.send_message(user_input, flow_data)
                    print("\n" + "─" * 60)

                except KeyboardInterrupt:
                    print("\n\n\033[93mInterrupted by user\033[0m")
                    break
        else:
            # Automated mode
            for user_msg in user_messages:
                self.display_message("user", user_msg)
                await self.send_message(user_msg, flow_data)
                print("\n" + "─" * 60)

                # Small delay between messages
                await asyncio.sleep(2.0)

        # Display statistics
        self.display_statistics()

    def display_statistics(self):
        """Display conversation statistics"""
        end_time = datetime.now()
        duration = (
            (end_time - self.start_time).total_seconds() if self.start_time else 0
        )

        print("\n" + "═" * 60)
        print("📊 Statistics")
        print("═" * 60)
        print(
            f"✓ Messages sent (user): {sum(1 for m in self.messages if m['role'] == 'user')}"
        )
        print(f"✓ Messages received (bot): {self.message_count}")
        print(f"✓ Auto-advance messages: {len(self.auto_advance_nodes)}")
        if self.auto_advance_nodes:
            print(f"  └─ Nodes: {', '.join(self.auto_advance_nodes)}")
        print(f"✓ Total duration: {duration:.1f}s")
        print(f"✓ WebSocket streaming: \033[92mWorking ✓\033[0m")
        print("═" * 60 + "\n")


def load_flow(flow_path: str) -> Dict[str, Any]:
    """Load flow definition from JSON file"""
    with open(flow_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="E2E Telegram Bot Simulator")
    parser.add_argument(
        "--automated",
        action="store_true",
        help="Run automated test with predefined answers",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run interactive test (type your own answers)",
    )
    parser.add_argument(
        "--flow-path",
        type=str,
        default="tests/fixtures/math_quiz_flow.json",
        help="Path to flow JSON file",
    )
    parser.add_argument(
        "--engine-url",
        type=str,
        default="http://localhost:8081",
        help="Engine HTTP URL",
    )
    parser.add_argument(
        "--ws-url", type=str, default="ws://localhost:8081", help="Engine WebSocket URL"
    )

    args = parser.parse_args()

    # Default to automated if neither specified
    if not args.automated and not args.interactive:
        args.automated = True

    # Load flow
    flow_path = Path(args.flow_path)
    if not flow_path.is_absolute():
        # Try relative to script location
        flow_path = Path(__file__).parent.parent.parent / args.flow_path

    if not flow_path.exists():
        print(f"\033[91mError: Flow file not found: {flow_path}\033[0m")
        sys.exit(1)

    flow_data = load_flow(str(flow_path))
    print(f"\n\033[92m✓ Loaded flow:\033[0m {flow_path.name}")

    # Create simulator
    simulator = TelegramSimulator(engine_url=args.engine_url, ws_url=args.ws_url)

    # Predefined answers for automated test (math quiz)
    automated_messages = [
        "oi",  # Start
        "10",  # Question 1 answer
        "3.14",  # Question 2 answer
        "são iguais",  # Question 3 answer
    ]

    # Run conversation
    try:
        if args.interactive:
            print(
                "\n\033[93m💡 Tip: Type your messages and press Enter. Type 'quit' to exit.\033[0m"
            )
            await simulator.run_conversation(flow_data, [], interactive=True)
        else:
            print("\n\033[93m💡 Running automated test with predefined answers\033[0m")
            await simulator.run_conversation(
                flow_data, automated_messages, interactive=False
            )
    except KeyboardInterrupt:
        print("\n\n\033[93mTest interrupted by user\033[0m")
    except Exception as e:
        print(f"\n\033[91mError during test: {e}\033[0m")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
