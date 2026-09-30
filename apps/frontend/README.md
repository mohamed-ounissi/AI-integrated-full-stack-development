# AutoCare Copilot — frontend

Next.js UI for support agents: a ticket panel with one-click structured summaries, and a streaming chat that shows which tools the model called and which knowledge-base docs it used.

## Run

```bash
npm install
npm run dev          # http://localhost:3000
```

Expects the backend on `http://localhost:3001`. To point elsewhere, set `NEXT_PUBLIC_BACKEND_URL` in `.env.local` (see [`.env.local.example`](.env.local.example)). No API keys live here — all AI calls go through the backend.

## Structure

```
src/
  app/                  layout + page (composes the two features)
  api/                  client.ts (base URL + fetch helper), chat.ts, tickets.ts
  features/
    chat/               useCopilotChat hook, chat panel, message rendering, model picker
    tickets/            ticket list, details, structured summary card
```

Answers are rendered as markdown (`react-markdown` + `remark-gfm`, styled with `@tailwindcss/typography`). Tool activity comes straight from the AI SDK message parts (`tool-lookupTicket`, `tool-searchKnowledgeBase`).
