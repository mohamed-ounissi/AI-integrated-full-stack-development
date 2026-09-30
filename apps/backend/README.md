# AutoCare Copilot — backend

NestJS API that owns every call to the AI providers and to MongoDB. The frontend never talks to either directly.

## Run

```bash
npm install
npm run start:dev      # http://localhost:3001, reloads on change
npm run build && npm run start
```

Config is read from `apps/backend/.env` if it exists, otherwise from the repo-root `.env` (see [`../../.env.example`](../../.env.example)). `GEMINI_API_KEY` and `MONGODB_URI` are required; `GROQ_API_KEY` / `OPENROUTER_API_KEY` each add a selectable chat model.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `POST` | `/chat` | Streams an answer (AI SDK UI-message stream). Body: `{ messages, provider? }`. The model can call `lookupTicket` and `searchKnowledgeBase`. |
| `GET` | `/chat/providers` | Configured chat models, with the default flagged: `[{ id, label, model, isDefault }]`. |
| `GET` | `/tickets` | All tickets. |
| `GET` | `/tickets/:id` | One ticket by its numeric id. |
| `POST` | `/tickets/:id/summary` | Structured summary, schema-validated: `{ title, keyPoints[], suggestedAction }`. |

## Modules

```
src/
  ai/               provider registry (Gemini, Groq, OpenRouter) + default-model choice
  chat/             POST /chat — system prompt, tools, streaming bridge to Express
  tickets/          Mongoose model, lookups, structured-output summaries
  knowledge-base/   query embedding + $vectorSearch over autocare.kb_chunks
```

Default chat model: Groq when `GROQ_API_KEY` is set, otherwise Gemini — Gemini's free tier (5 req/min, 20/day) runs out quickly for a tool-using assistant. See [`../../docs/comparison.md`](../../docs/comparison.md).
