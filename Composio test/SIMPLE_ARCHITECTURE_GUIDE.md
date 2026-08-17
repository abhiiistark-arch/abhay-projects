# Simple Architecture Guide

This document explains the implemented endpoint validation agent in simple language, with enough depth for interview discussion.

It is a companion to `ARCHITECTURE.md`, not a replacement.

## 1) What this project is doing

The goal is to test whether each API endpoint can actually be executed at least once and classify it as:

- `valid`
- `invalid_endpoint`
- `insufficient_scopes`
- `error`

This is endpoint executability validation, not full business testing.

## 2) How the agent behaves (high level)

The agent runs from `runAgent()` in `src/agent.ts`.

1. It receives all endpoint definitions.
2. It creates one independent worker per endpoint.
3. Each worker runs a small Reason -> Act -> Observe retry loop.
4. Each worker returns one final result.
5. The orchestrator combines all results into `TestReport`.

This matches the "one agent per endpoint" idea from the assignment while still using one entry function.

## 3) How one endpoint worker works

For each endpoint, the worker:

1. Picks account candidates (tries provided `connectedAccountId` first, then mapped fallback accounts).
2. Resolves path parameters if needed (for example `{messageId}` or `{eventId}`).
3. Builds request input from schema:
   - query params
   - body payload (if needed)
4. Calls `proxyExecute()`.
5. Classifies response.
6. If needed, retries with a safer strategy before final classification.

## 4) Request strategies used

The worker uses bounded strategies to reduce false negatives:

- **Minimal request**: only required pieces.
- **Safe query defaults**: small, low-risk optional values (like `maxResults`).
- **Dependency-assisted**: list -> extract ID -> call detail endpoint.

This keeps execution stable and avoids over-testing.

## 5) Dependency resolution (simple explanation)

If an endpoint path has placeholders (like `{eventId}`), the agent:

1. Finds possible list endpoints in the same app.
2. Calls those list endpoints safely.
3. Extracts usable IDs from response JSON.
4. Substitutes ID into the target path.
5. Executes the target endpoint.

It also caches discovered IDs so repeated lookups are faster.

## 6) Classification rules

- **valid**: any 2xx status.
- **insufficient_scopes**: 403 or permission/scope denial signals.
- **invalid_endpoint**: 404/405 or clear endpoint-not-found signals.
- **error**: anything else (bad request, transient issue, unknown failure).

These rules are deterministic, so results are explainable.

## 7) Safety and reliability

- Uses `proxyExecute()` only (no raw token handling).
- Redacts sensitive data in stored response summaries.
- Truncates very large response bodies.
- Uses bounded retries to avoid API abuse and noisy behavior.
- Handles account routing differences with fallback account attempts.

## 8) Gmail and Calendar usage in this setup

The runner executes all endpoints from `src/endpoints.json` (Gmail + Google Calendar).

In recent runs:

- Most Gmail and Calendar endpoints are `valid`.
- Fake endpoints are correctly marked `invalid_endpoint`.
- Calendar create/get/delete flow is exercised through real API calls.

## 9) Recent updates made in `ARCHITECTURE.md`

A new enhancement section was added to make the design stronger for evaluation:

- **Confidence tags (internal)** for classification quality.
- **Dependency graph cache** to reuse discovered provider patterns.
- **Pluggable strategy pipeline** to add new attempt types cleanly.
- **Error-family normalization** for cross-app consistency.
- **Bounded concurrency controls** for scale/rate-limit balance.
- **Lightweight observability** (timing/attempt counts) for diagnostics.

Also added a direct mapping section showing how the architecture supports the assignment rubric:

- correctness across apps
- false-negative reduction
- dependency resolution
- architecture quality
- completeness

## 10) Why this is a strong submission shape

- It is aligned with required stack and contract (`Bun`, `runAgent()`, `TestReport`).
- It is robust enough for fake endpoints + dependency-heavy endpoints.
- It is mostly app-agnostic and intentionally designed to generalize.
- It is explainable in both technical and non-technical interviews.

## 11) Quick talking points for Loom/video

- "I designed endpoint-level workers with shared context for scale."
- "I used a bounded ReAct-like loop to reduce false negatives."
- "I built generic dependency resolution rather than hardcoding Gmail logic."
- "I normalized classification for consistency across apps."
- "I added architecture enhancements (confidence, telemetry, strategy modularity) for production-readiness."
