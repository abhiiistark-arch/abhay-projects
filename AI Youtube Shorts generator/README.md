# YouTube Shorts Automation Pipeline

One-click AI pipeline that scrapes YouTube trends, analyzes viral potential with **Gemini 3.1 Pro**, generates cinematic Shorts with **Veo 3.1**, uploads via browser automation, and learns from performance analytics — all using only your Gemini API key.

![Pipeline Flow](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Celery%20%7C%20Redis%20%7C%20Veo%203.1-red)
![Python](https://img.shields.io/badge/Python-3.11-blue)

## Features

- **No YouTube Data API** — scrapes `ytInitialData` from public pages with httpx + BeautifulSoup
- **Gemini 3.1 Pro** — scores trends, writes 50–58s scripts with `[BEAT]` markers, generates SEO tags
- **Veo 3.1** — 6–7 eight-second cinematic clips per Short (native motion, camera, lighting, ambient audio)
- **FFmpeg assembly** — concatenates to 1080×1920 @ 30fps MP4
- **Cookie-based upload** — Playwright automates YouTube Studio (no OAuth)
- **24h analytics loop** — scrapes public stats and feeds insights back to Gemini
- **Dark dashboard** — pulsing START button, live metrics, auto-refresh every 30s

## Architecture

```
Dashboard (localhost:8000)
    │
    ▼ START PIPELINE
┌─────────────────────────────────────────────────────────┐
│ Phase 1: scrape_trends → analyze_and_generate_content   │
├─────────────────────────────────────────────────────────┤
│ Phase 2: chord[ generate_video × 4 ] → upload (chain)   │
├─────────────────────────────────────────────────────────┤
│ Phase 3: collect_analytics (+24h) → feedback (+25h)     │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Gemini API key** | With Veo 3.1 access — [Google AI Studio](https://aistudio.google.com/apikey) |
| **YouTube account** | Free — used for uploading Shorts |
| **Docker** (recommended) | Redis, API, Worker, Scheduler |
| **FFmpeg** | Included in Docker; install locally for dev |
| **Python 3.11** | For local development |

## Quick Start (One Command)

```powershell
cd "C:\Users\Abhay Pandey\Desktop\Projects\AI Youtube Shorts generator"
python run.py
```

Or double-click **`START.bat`**.

**Install once before first run:**
- Redis: `winget install Memurai.MemuraiDeveloper` → start Memurai service
- FFmpeg: `winget install Gyan.FFmpeg`
- Add `GEMINI_API_KEY` to `.env`

Then open http://127.0.0.1:8000 → **START PIPELINE**.

Full guide: **[LOCAL_SETUP.md](./LOCAL_SETUP.md)**

## Quick Start (Manual scripts — optional)

## Local Development

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Edit .env with your keys

# Terminal 1 — Redis (or use Docker: docker run -p 6379:6379 redis:7-alpine)
redis-server

# Terminal 2 — API
uvicorn app.main:app --reload --port 8000

# Terminal 3 — Celery worker
celery -A app.workers.celery_tasks worker --loglevel=info --concurrency=4

# Terminal 4 — Celery beat (scheduler)
celery -A app.workers.celery_tasks beat --loglevel=info
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | **Required** |
| `YOUTUBE_CLIENT_ID` | OAuth client ID (Desktop app) | From `youtube_oauth_setup.py` |
| `YOUTUBE_CLIENT_SECRET` | OAuth client secret | From `youtube_oauth_setup.py` |
| `YOUTUBE_REFRESH_TOKEN` | OAuth refresh token | From `youtube_oauth_setup.py` |
| `YOUTUBE_CHANNEL_ID` | Your channel ID | **Required** (auto-detected via `--verify`) |
| `YOUTUBE_UPLOAD_PRIVACY` | `PUBLIC`, `UNLISTED`, or `PRIVATE` | `UNLISTED` |
| `YOUTUBE_CATEGORY_ID` | YouTube category | `22` (People & Blogs) |
| `VEO_MODEL` | Veo model name | `veo-3.1-generate-preview` |
| `GEMINI_TEXT_MODEL` | Text/analysis model | `gemini-3.1-pro-preview` |
| `MAX_PARALLEL_VIDEOS` | Parallel Celery video workers | `4` |
| `VIDEOS_PER_PIPELINE` | Shorts per pipeline run | `4` |
| `SEGMENTS_PER_VIDEO` | Veo clips per Short (~8s each) | `7` |

## YouTube Setup (Data API — Free Within Quota)

Upload uses **YouTube Data API v3** with OAuth (no browser automation). Default quota is ~10,000 units/day; each upload costs ~1,600 units (~6 uploads/day).

**One-time setup:**

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project
2. Enable **YouTube Data API v3**
3. Create **OAuth client ID → Desktop app** → download JSON as `client_secrets.json` in project root
4. Run `python scripts/youtube_oauth_setup.py` (opens browser once for consent)
5. Copy the printed `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `YOUTUBE_REFRESH_TOKEN` into `.env`
6. Verify: `python scripts/youtube_oauth_setup.py --verify`
7. Test upload: `python scripts/test_youtube_upload.py`

**Find your Channel ID:** Run `--verify`, or open YouTube Studio — the URL contains `/channel/UCxxxxxxxxxx`.

> If auth fails, revoke app access at [Google Account permissions](https://myaccount.google.com/permissions) and re-run the setup script.

## What You Need to Provide

| Item | Required? | How |
|------|-----------|-----|
| Gemini API key | **Yes** | Set `GEMINI_API_KEY` in `.env` |
| YouTube OAuth credentials | **Yes** (for upload) | Run `scripts/youtube_oauth_setup.py` |
| YouTube Channel ID | **Yes** (for upload) | Set `YOUTUBE_CHANNEL_ID` in `.env` |

You can run topic discovery → generate without YouTube credentials; upload will fail until OAuth is configured.

## Project Structure

```
app/
├── main.py                 # FastAPI dashboard + API
├── config.py               # Pydantic Settings
├── models/database.py      # SQLAlchemy models
├── services/
│   ├── trend_scraper.py    # YouTube scraping
│   ├── content_engine.py   # Gemini content generation
│   ├── video_generator.py  # Veo 3.1 + FFmpeg
│   ├── youtube_api_uploader.py # YouTube Data API upload
│   ├── youtube_uploader.py     # Upload facade (used by pipeline)
│   └── analytics_scraper.py
├── workers/celery_tasks.py # Pipeline orchestration
├── templates/dashboard.html
└── static/dashboard.css
```

## Meaningful Veo Shorts

The content engine is tuned so each Veo clip **directly illustrates the narration beat**:

- Gemini generates a `scene_breakdown` with per-beat `scene_prompt` + `narration_line`
- Each Veo prompt includes the trend topic, camera movement, lighting, and ambient audio
- Scenes are chained with consistent `visual_prompt` master direction
- Scripts are 50–58 seconds with `[BEAT]` markers aligned to ~8s clips

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Dashboard UI |
| POST | `/api/pipeline/start` | Start full pipeline |
| GET | `/api/metrics` | Real-time metrics |
| GET | `/api/videos/recent` | Recent video grid |
| GET | `/api/pipeline/history` | Pipeline run history |
| GET | `/api/health` | System health check |

## Frontend Note

This project uses a **self-contained dark-themed dashboard** (Jinja2 + modern CSS) served directly by FastAPI — ideal for one-click Docker deployment without a Node.js build step.

If you prefer the official [Full Stack FastAPI Template](https://github.com/tiangolo/full-stack-fastapi-template) (React 19 + Tailwind + shadcn/ui), you can migrate the API endpoints to that frontend later.

## Security

**Keep your API key safe:**

| Do | Don't |
|----|-------|
| Store key only in `.env` (gitignored) | Commit `.env` to GitHub |
| Use `.env.example` with placeholder values | Paste real keys in code, README, or chat |
| Rotate key at [Google AI Studio](https://aistudio.google.com/apikey) if exposed | Share screen with `.env` open |
| Run with `DEBUG=false` in production (hides `/docs`) | Push Docker images that contain `.env` |

The project includes:
- **`.dockerignore`** — `.env` is never copied into Docker images
- **`SecretStr`** — Pydantic masks the key in logs/repr
- **Log redaction** — API keys are scrubbed from log output
- **Disabled OpenAPI docs** when `DEBUG=false`

If your key was ever exposed, **regenerate it immediately** in Google AI Studio and update `.env`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GEMINI_API_KEY` error | Add key to `.env`, restart containers |
| Veo timeout | Veo generation can take 2–5 min per clip; ensure API has Veo access |
| Upload fails | Run `youtube_oauth_setup.py --verify`; check OAuth vars in `.env` |
| Redis disconnected | Ensure `docker compose up redis` or local Redis is running |
| FFmpeg not found | Use Docker, or install FFmpeg locally |

## License

MIT
