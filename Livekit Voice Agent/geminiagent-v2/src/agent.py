import logging
import os
import textwrap

from dotenv import load_dotenv
from google.genai import types
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, cli
from livekit.plugins import google

logger = logging.getLogger("geminiagent-v2")

load_dotenv(".env")

if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

# Fastest supported Gemini Live model (native audio in/out).
# Fallback: gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_VOICE_MODEL = os.getenv(
    "GEMINI_VOICE_MODEL", "gemini-3.1-flash-live-preview"
)
# Female voices: Kore, Aoede | Others: Puck, Charon, Fenrir
GEMINI_VOICE = os.getenv("GEMINI_VOICE", "Kore")

ASSISTANT_INSTRUCTIONS = textwrap.dedent(
    """\
    You are a knowledgeable female voice assistant that answers questions clearly and accurately.

    Voice rules:
    - Speak naturally in plain language. No markdown, lists, code, or emojis.
    - Default to one or two short sentences. Only go longer if the user asks for detail.
    - Be direct. Skip filler phrases like "Great question" or "Sure, I'd be happy to help."
    - Ask one clarifying question when needed, not several.
    - For medical, legal, or financial topics, give general info and suggest a professional.
    - Decline harmful or inappropriate requests.
    """
)


def _low_latency_input_config() -> types.RealtimeInputConfig:
    """Gemini built-in turn detection tuned for faster replies."""
    return types.RealtimeInputConfig(
        automatic_activity_detection=types.AutomaticActivityDetection(
            disabled=False,
            start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_HIGH,
            end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_HIGH,
            prefix_padding_ms=20,
            silence_duration_ms=400,
        ),
    )


def _build_realtime_model() -> google.realtime.RealtimeModel:
    thinking_config: types.ThinkingConfig
    if "3." in GEMINI_VOICE_MODEL:
        # Gemini 3.x: minimal thinking keeps quality while cutting wait time.
        thinking_config = types.ThinkingConfig(thinking_level=types.ThinkingLevel.MINIMAL)
    else:
        # Gemini 2.5.x: disable extra reasoning tokens for lower latency.
        thinking_config = types.ThinkingConfig(thinking_budget=0)

    return google.realtime.RealtimeModel(
        model=GEMINI_VOICE_MODEL,
        voice=GEMINI_VOICE,
        instructions=ASSISTANT_INSTRUCTIONS,
        temperature=0.6,
        max_output_tokens=512,
        thinking_config=thinking_config,
        realtime_input_config=_low_latency_input_config(),
        # Skip transcription — saves work on every turn (voice-only path).
        input_audio_transcription=None,
        output_audio_transcription=None,
        enable_affective_dialog=False,
        proactivity=False,
    )


class GeminiVoiceAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=ASSISTANT_INSTRUCTIONS)


server = AgentServer()


@server.rtc_session(agent_name="geminiagent-v2")
async def gemini_voice_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
        "model": GEMINI_VOICE_MODEL,
    }

    await ctx.connect()

    session = AgentSession(llm=_build_realtime_model())

    await session.start(
        room=ctx.room,
        agent=GeminiVoiceAssistant(),
    )


if __name__ == "__main__":
    cli.run_app(server)
