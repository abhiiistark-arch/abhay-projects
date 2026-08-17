# Anne Voice Options

Anne uses **Cartesia Sonic 3** via LiveKit Inference. Set the voice and speed in your `.env` file, then restart the agent.

```env
TTS_VOICE=6ccbfb76-1fc6-48f7-b71d-91ac6298247b
TTS_SPEED=0.9
```

## Available Voices

| Name | Style | Voice ID | Best For |
| --- | --- | --- | --- |
| **Tessa** (default) | Warm, friendly companion | `6ccbfb76-1fc6-48f7-b71d-91ac6298247b` | Companion apps, natural conversation |
| **Ariana** | Kind, approachable | `ec1e269e-9ca0-402f-8a18-58e0e022355a` | Warm, welcoming tone |
| **Skylar** | Friendly guide | `db6b0ed5-d5d3-463d-ae85-518a07d3c2b4` | Customer care, supportive chat |
| **Katie** | Clear, conversational | `f786b574-daa5-4673-aa0c-cbe3e8534c02` | Stable, realistic voice agents |
| **Gemma** | British, confident | `62ae83ad-4f6a-430b-af41-a9bede9286ca` | Professional, decisive tone |
| **Jacqueline** | Reassuring, empathic | `9626c31c-bec5-4cca-baa8-f8ba9e84c8bc` | Calm, supportive responses |

## Speech Speed

| `TTS_SPEED` | Effect |
| --- | --- |
| `0.85` | Noticeably slower |
| `0.9` | Slightly slower (current default) |
| `1.0` | Normal speed |
| `1.1` | Slightly faster |

## How to Switch Voices

1. Copy a **Voice ID** from the table above.
2. Paste it into `.env` as `TTS_VOICE=<voice-id>`.
3. Restart the agent:

```powershell
python src\agent.py console
```
