# Local Setup (No Docker)

Run the entire pipeline on your Windows PC. Your API key stays in `.env` on your machine only — nothing is copied into Docker images.

## Run with ONE command

```powershell
cd "C:\Users\Abhay Pandey\Desktop\Projects\AI Youtube Shorts generator"
python run.py
```

Or double-click **`START.bat`**.

This single command will:
1. Create/update `.venv` and install packages (first run)
2. Configure `.env` for secure local use
3. Check Redis + FFmpeg
4. Start API server + Celery worker
5. Open http://127.0.0.1:8000 in your browser

Click **START PIPELINE** on the dashboard. Press **Ctrl+C** in the terminal to stop everything.

**Prerequisites** (install once):
- **FFmpeg**: `winget install Gyan.FFmpeg` (or download from ffmpeg.org)
- **`GEMINI_API_KEY`** in `.env`
- **Redis**: optional — if not installed, `run.py` auto-enables sync mode (no Redis needed)

---

## Manual setup (optional)

Celery needs Redis. Pick **one** option:

**Option A — Memurai (easiest on Windows)**  
```powershell
winget install Memurai.MemuraiDeveloper
```
Start **Memurai** from Windows Services (runs on port 6379).

**Option B — Scoop**  
```powershell
scoop install redis
redis-server
```
Keep that terminal open.

**Option C — WSL**  
```bash
sudo apt install redis-server
redis-server
```

## 3. Install FFmpeg (required once)

```powershell
winget install Gyan.FFmpeg
```
Restart PowerShell after install, then verify: `ffmpeg -version`

## 4. Configure secrets (local `.env` only)

Edit `.env` on your machine:

```env
GEMINI_API_KEY=your_key_here
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxx
```

Never commit `.env` or paste keys in chat.

## 5. Export YouTube cookies (for upload)

```powershell
.\.venv\Scripts\Activate.ps1
python scripts\export_cookies.py
```

## 6. Check everything

```powershell
.\scripts\check_prerequisites.ps1
```

## 7. Start the pipeline

**Double-click:** `START.bat`

**Or PowerShell:**
```powershell
.\scripts\start_local.ps1
```

Opens two windows:
- **API Server** → http://127.0.0.1:8000
- **Celery Worker** → processes scrape, Gemini, Veo, upload tasks

Click **START PIPELINE** on the dashboard.

## Security (local-only)

Your API key **never leaves your machine**:

| Protection | What it does |
|------------|--------------|
| `.env` gitignored | Never committed to git |
| `SecretStr` | Key masked in Python logs/repr |
| Log redaction | `AIza...` patterns scrubbed from logs & errors |
| `LOCAL_ONLY=true` | API rejects non-localhost requests |
| `127.0.0.1` bind | Dashboard not reachable from other devices |
| No `/data/cookies` mount | Cookie file cannot be downloaded via HTTP |
| `/docs` disabled | OpenAPI hidden when `DEBUG=false` |

Run before each session:

```powershell
.\scripts\verify_security.ps1
```

## Stop

Press **Ctrl+C** in the terminal where `run.py` is running (stops API + worker together).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Redis not running | Start Memurai or `redis-server` |
| `ffmpeg not found` | Install FFmpeg, restart terminal |
| Worker does nothing | Ensure Redis PONG: `redis-cli ping` |
| Upload fails | Re-run `python scripts\export_cookies.py` |
| Celery errors on Windows | Worker uses `--pool=threads` (already in start script) |

## Why no Docker?

- API key stays in local `.env` only
- No image layers, no container env leakage
- Easier to debug in two terminal windows
- Dashboard bound to `127.0.0.1` (not your whole network)
