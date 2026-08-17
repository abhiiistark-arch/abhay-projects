# Loom Quick Revision (1 Page)

## Problem in one line
Build an agent that executes each endpoint once (or with bounded safe retries) and classifies it as `valid`, `invalid_endpoint`, `insufficient_scopes`, or `error`.

## Architecture in one minute

- **Orchestrator (`runAgent`)**
  - receives all endpoint definitions
  - creates one logical worker per endpoint
  - aggregates results into final `TestReport`
- **Endpoint Worker**
  - Reason -> Act -> Observe retry loop
  - tries minimal request first, then safe fallback strategy
  - returns exactly one endpoint report
- **Shared context**
  - account candidates + scopes cache
  - dependency ID cache
  - response sanitizer + classifier

## Core design choices

- **One agent per endpoint behavior**: aligned with assignment architecture ask.
- **No fixed execution order**: workers can run independently/concurrently.
- **Dependency-aware execution**: resolves `{id}` params via list->extract->substitute.
- **Bounded retries**: reduces false negatives without becoming noisy.
- **Deterministic classification**: stable and explainable output.

## Classification logic (say this clearly)

- `2xx` -> `valid`
- `403` / scope-denied signals -> `insufficient_scopes`
- `404/405` or clear not-found/method-not-allowed -> `invalid_endpoint`
- all others -> `error`

## How false negatives are reduced

- Starts with minimal valid request (required params/body only).
- Uses safe optional query defaults only when helpful.
- Resolves path dependencies before failing path-param endpoints.
- Avoids labeling `400` as invalid endpoint (keeps it as `error`).

## What makes it generalizable

- Mostly schema-driven request construction from endpoint definitions.
- Generic ID extraction from common response shapes (`items`, nested `id`).
- Error normalization and deterministic status mapping.
- Avoids hardcoded endpoint order and app-specific orchestration.

## Recent architecture enhancements (mention for brownie points)

- internal confidence tagging concept
- dependency graph cache concept
- pluggable strategy pipeline concept
- normalized error families
- bounded concurrency controls
- lightweight observability (timing + attempt count)

## Current status snapshot

- Runner validation passes (`bun src/run.ts`)
- Report generated in `report.json`
- Architecture documentation completed in `ARCHITECTURE.md`
- Simple companion explanation in `SIMPLE_ARCHITECTURE_GUIDE.md`

## 30-second close statement

"I built an endpoint-worker architecture with a bounded ReAct-style execution loop. It dynamically resolves path dependencies, constructs minimal schema-based requests, and classifies outcomes deterministically. The design is explainable, scalable, and aligned to the assignment contract while minimizing false negatives."
