# AGENTS.md

Guidance for AI agents working in this repository.

## Project Overview

RPKClust-UI is a research tool for binary protocol reverse engineering. It combines a Python backend (protocol analysis pipeline) with a React/TypeScript frontend (interactive dashboard). The project implements algorithms published in *The Computer Journal* (2025).

## Architecture

### Python Backend (`rpkclust/`)

- **Entry points**: `cli.py` (CLI), `api_runner.py` (JSON stdin/stdout for frontend), `pipeline.py` (orchestration)
- **Data flow**: PCAP → `io/loader.py` → `io/sessions.py` → `boundary.py` → `candidates/` → `constraints/stage1.py` + `constraints/stage2.py` → `cluster.py` → `metrics.py`
- **All data models are frozen dataclasses** in `model.py` — never mutate, always create new instances
- **Config** (`config.py`) is the single source of truth for all ~30+ hyperparameters; supports JSON serialization
- **Detectors** follow a Protocol-based registry pattern in `detectors/` — each detector is a class implementing the `Detector` protocol
- **Pipeline stages return diagnostic dicts** for explainability — preserve this pattern when adding stages

### Frontend (`src/`)

- **Single-file app**: All UI lives in `App.tsx` (~1000+ lines) with tab-based navigation
- **No external state management** — uses React `useState`/`useEffect` hooks only
- **API communication**: `fetch('/api/run', ...)` POST to Vite middleware defined in `vite.config.ts`
- **TypeScript interfaces** for all data types — keep in sync with Python dataclass field names
- **Styling**: Tailwind CSS 4, dark theme (slate-950 base), utility classes only

## Code Conventions

### Python

- Use `from __future__ import annotations` for forward references
- Type hints on all function signatures
- Frozen dataclasses for all data models
- `Optional[X]` instead of `X | None` (Python 3.10 compatibility)
- Docstrings on public classes and functions
- Tests in `tests/` using pytest, no mocking framework — use synthetic `Message` objects

### TypeScript/React

- Interface-driven development — define interfaces for all API response types
- Functional components with hooks only (no class components)
- Tailwind utility classes, no custom CSS beyond `index.css`
- lucide-react for icons, motion for animations

## Common Tasks

### Adding a new detector

1. Create a new file in `rpkclust/detectors/`
2. Implement the `Detector` protocol from `detectors/base.py`
3. Register in `detectors/registry.py` `DEFAULT_RULES` list
4. Add tests in `tests/test_detectors.py`

### Adding a new config parameter

1. Add field to `Config` dataclass in `rpkclust/config.py`
2. Update `to_dict()`/`from_dict()` if custom serialization needed
3. Update the frontend `Config` interface in `src/App.tsx`
4. Add UI control in the hyperparameter tuning section

### Modifying the pipeline

1. Edit the relevant stage file (e.g., `boundary.py`, `candidates/`, `constraints/`)
2. Update `pipeline.py` if the stage signature changes
3. Update `api_runner.py` if the API response format changes
4. Update frontend TypeScript interfaces to match

### Running tests

```bash
pytest tests/                              # all tests
pytest tests/test_boundary.py              # single file
pytest tests/test_fig1_pipeline.py -v      # verbose
```

### Building for production

```bash
npm run build      # builds frontend to dist/
npm run typecheck  # TypeScript type checking (tsc --noEmit)
```

## Key Files to Know

| File | Why It Matters |
|---|---|
| `rpkclust/pipeline.py` | Orchestrates the entire analysis pipeline |
| `rpkclust/config.py` | All tunable hyperparameters in one place |
| `rpkclust/model.py` | Core data structures shared across all stages |
| `rpkclust/api_runner.py` | Bridge between frontend and backend |
| `src/App.tsx` | Entire frontend application |
| `vite.config.ts` | Build config + API middleware plugin |
| `tests/test_fig1_pipeline.py` | End-to-end test reproducing paper Figure 1 |

## Vite API Middleware

The `vite.config.ts` defines a custom `apiPlugin()` that intercepts `POST /api/run` requests and spawns `python3 -m rpkclust.api_runner`, piping the request body to stdin and returning stdout as JSON. This is the sole communication channel between frontend and backend during development.

## Environment Variables

- `GEMINI_API_KEY` — for Gemini AI integration (injected by AI Studio)
- `APP_URL` — hosted URL for self-referential links
- `DISABLE_HMR=true` — disables Hot Module Replacement (used in AI Studio to prevent flickering)
