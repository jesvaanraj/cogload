# CogLoad

A VSCode extension + backend that estimates cognitive load from typing behavior and adjusts how an AI coding assistant responds — fewer interruptions when you're in flow, lighter-weight suggestions when you're tired.

I built this because I kept noticing that the same AI suggestions felt helpful in the morning and annoying by hour four. The assistant had no idea whether I was deep in a problem or running on fumes. CogLoad is an attempt to give it that context using signals that are already available — keystroke timing, pause patterns, edit/delete ratio — instead of anything invasive like webcams or biometrics.

## How it works

The extension watches typing telemetry (timing between keystrokes, pause length, backspace frequency, etc.) and sends periodic snapshots to a backend over WebSocket. The backend scores each snapshot on a 1–10 cognitive load scale and classifies it into a state: fresh, normal, tired, flow, or critical. That state is then used to decide how the AI layer responds — e.g. flow state suppresses non-critical suggestions entirely.

There are two scoring paths:
- **Rule-based fallback** — used out of the box, before any model is trained. Simple thresholds on the raw features.
- **Trained model** — a gradient boosting classifier trained on labeled sessions (you label your own data; there's no universal "tired" signature, so this is meant to be personalized).

A dashboard shows live load over time, state distribution, and session history.

## Project structure

```
cogload/
├── extension/          VSCode extension (TypeScript)
├── backend/             FastAPI backend + WebSocket server
│   ├── routers/         API route handlers
│   ├── services/        Feature extraction, scoring, LLM integration
│   ├── db/               Database setup + queries
│   └── dashboard/       Web dashboard (vanilla JS, Chart.js)
├── ml/                  Model training pipeline
│   ├── train.py
│   └── data/             Labeled session CSVs go here
├── docker-compose.yml
└── .env.example
```

## Running it locally

**Backend**
```bash
cd cogload
cp .env.example .env
# optionally add OPENAI_API_KEY if you want LLM-based suggestions
docker compose up --build
```
- API: http://localhost:8000
- Dashboard: http://localhost:8000/dashboard
- Docs: http://localhost:8000/docs

**Extension**
```bash
cd extension
npm install
npm run compile
```
Press `F5` in VSCode to launch the Extension Development Host. The status bar shows the connection state (starting → connected).

**Training the model (optional)**
```bash
cd ml
python train.py --generate-sample --data data/labeled_sessions.csv   # synthetic data to sanity-check the pipeline
python train.py --data data/labeled_sessions.csv                      # real training
```
The model is saved to `ml/saved_models/cogload_model.pkl` and picked up automatically by the backend on next restart. Until a model exists, the backend just uses the rule-based scorer.

## Labeling your own data

The model is only as good as the labels, and load is subjective enough that I didn't trust a generic pretrained model to transfer well across people. The workflow:

1. Code normally for 30–60 minutes with the extension running.
2. Every 30 seconds, jot down a 1–10 self-rating of mental load.
3. Pull the session via `GET /api/sessions/{id}`, line up your labels with the timestamps.
4. Retrain with `train.py`.

It's manual and a bit tedious — automating label collection (e.g. a lightweight in-editor prompt) is on the list.

## Configuration

In VSCode settings (`Ctrl+,` → "cogload"):

| Setting | Default | Description |
|---|---|---|
| `cogload.backendUrl` | `ws://localhost:8000/ws/telemetry` | Backend WebSocket URL |
| `cogload.snapshotIntervalSeconds` | `30` | How often telemetry is sent |
| `cogload.showNotifications` | `true` | Show load alerts in VSCode |

## Stack

| Layer | Tech |
|---|---|
| Editor extension | TypeScript, VSCode API |
| Backend | Python, FastAPI, WebSockets |
| Database | SQLite (dev), PostgreSQL (prod) |
| Model | scikit-learn (gradient boosting) |
| LLM layer | OpenAI GPT-4o-mini / Gemini |
| Dashboard | Vanilla JS, Chart.js |
| Infra | Docker, Docker Compose |

## Known limitations / what I'd do next

- The rule-based fallback is fairly crude — it works as a cold-start, but the gap between it and the trained model is large.
- Labels are self-reported and almost certainly noisy. Some kind of passive ground truth (task completion time, error rate) would help validate the scores.
- Right now everything is single-user; there's no multi-tenant auth on the backend, which is fine for personal use but would need work before anyone else touches it.
- The "flow" state detection is the part I trust least — it's currently inferred from sustained low-variance typing, but that overlaps with "stuck and not typing much," which is the opposite of flow.

## Author

**Jesvaan Raj** — [github.com/jesvaanraj](https://github.com/jesvaanraj)
