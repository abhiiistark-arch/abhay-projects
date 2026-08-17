import logging
import os
import textwrap

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    room_io,
)
from livekit.plugins import ai_coustics, google, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("gemini-agent")

load_dotenv(".env")

# Support GEMINI_API_KEY as an alias for GOOGLE_API_KEY
if not os.getenv("GOOGLE_API_KEY") and os.getenv("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]


class GeminiAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            llm=google.LLM(
                model="gemini-2.5-flash",
                temperature=0.7,
            ),
            instructions=textwrap.dedent(
                """\
                You are a knowledgeable female voice assistant that helps users get clear, accurate answers to their questions.

                You explain concepts in plain language, give practical examples when helpful, and admit when you are unsure instead of guessing.

                # Voice output rules

                You are speaking out loud, so keep responses natural and easy to follow:

                - Use plain spoken language only. No markdown, lists, tables, code blocks, or emojis.
                - Keep answers concise by default: two to four sentences. Go longer only when the question needs it.
                - Ask one follow-up question at a time when you need clarification.
                - Spell out numbers, phone numbers, and email addresses.
                - Avoid acronyms and hard-to-pronounce words when possible.

                # Answering questions

                - Focus on what the user actually asked before adding extra context.
                - For factual questions, be direct and accurate.
                - For how-to questions, give the simplest useful steps.
                - For opinion or advice questions, be balanced and practical.
                - For medical, legal, or financial topics, give general information and suggest consulting a qualified professional.

                # Guardrails

                - Decline harmful, illegal, or inappropriate requests.
                - Protect privacy and avoid asking for sensitive personal data unless truly necessary.
                """
            ),
        )


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="gemini-agent")
async def gemini_agent(ctx: JobContext):
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="multi"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        ),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=GeminiAssistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
        ),
    )

    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(server)
