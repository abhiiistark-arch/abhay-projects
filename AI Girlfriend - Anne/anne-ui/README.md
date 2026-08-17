# Anne UI

A React + TypeScript voice chat frontend for **Anne**, your AI girlfriend. Built on the [LiveKit Agent Starter for React](https://github.com/livekit-examples/agent-starter-react).

This folder is separate from the Python backend in `../gemini-agent`.

## Features

- Anne's portrait in a styled box container
- Real-time voice conversation with speaking/listening animations
- Camera on/off toggle (your video appears as a small tile when enabled)
- Live transcript chat
- Microphone mute/unmute
- Light/dark theme

## Prerequisites

1. **LiveKit Cloud** credentials (same as `gemini-agent/.env`)
2. **gemini-agent** backend running

## Setup

```bash
cd anne-ui
npm install
cp .env.example .env.local   # then fill in your LiveKit keys
```

`.env.local` must include:

```env
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://your-project.livekit.cloud
AGENT_NAME=gemini-agent
```

## Run

**Terminal 1 — Backend agent:**

```bash
cd ../gemini-agent
uv run python src/agent.py dev
```

**Terminal 2 — Anne UI:**

```bash
cd anne-ui
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Talk to Anne**, and start speaking.

## Project structure

```
anne-ui/
├── app/                  # Next.js pages & token API
├── components/
│   ├── app/              # Anne-specific UI (avatar, welcome)
│   └── agents-ui/        # LiveKit voice agent components
├── public/
│   └── anne.png          # Anne's portrait
└── app-config.ts         # Branding & feature flags
```

## Controls

| Control | Description |
|---------|-------------|
| Microphone | Mute/unmute your voice |
| Camera | Turn your webcam on or off |
| Chat | Show/hide live transcript |
| End Call | Disconnect from Anne |
