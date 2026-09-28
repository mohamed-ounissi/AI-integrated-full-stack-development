# Architecture & Build Log

Two things live in this one file: the big picture (how the pieces connect right now) and a step-by-step log of what was added at each milestone and why. Update both as you go — don't wait until the end.

## The big picture

```
 You (browser)
     │
     │ types a message
     ▼
┌───────────────────┐   useChat() streams the reply back, token by token
│  Next.js            │◄─────────────────────────────────────────────┐
│  (apps/frontend)     │                                              │
│  display only —      │                                              │
│  no AI or DB logic    │                                              │
└──────────┬───────────┘                                              │
           │ POST /chat  (just forwards the conversation as-is)       │
           ▼                                                          │
┌──────────────────────────────────────────────────────────────────┐ │
│  NestJS backend (apps/backend)                                      │ │
│  the only piece that talks to both the AI and the database          │─┘
│  decides which "tools" the AI is allowed to call                     │
└───────────┬─────────────────────────────┬──────────────────────---──┘
            │                              │
            │ "get the real                │ "read this message, decide
            │  ticket #9 data"             │  if a tool is needed, then
            ▼                              │  write the reply"
┌───────────────────────┐                   ▼
│  MongoDB Atlas           │      ┌────────────────────────┐
│  autocare.tickets        │      │  Google Gemini            │
│  the only source of truth│      │  via the Vercel AI SDK    │
│  for real data            │      │  understands language,   │
└───────────────────────┘      │  decides what to do next │
                                   └────────────────────────┘
```

Three boxes, three jobs, don't mix them up:
- **Frontend (Next.js)** — display only. It has no idea AI or a database exist. It sends the conversation to the backend and renders whatever streams back.
- **Backend (NestJS)** — the only thing that talks to Gemini *and* MongoDB. This is the important part: **the AI never touches the database directly.** The backend hands Gemini a fixed "menu of tools" (right now: `lookupTicket`). Gemini can only get real data by asking for one of those tools to run, and the backend is the one that actually executes it against MongoDB and hands the result back.
- **AI (Gemini, called through the Vercel AI SDK)** — only understands language and makes decisions. It can't reach anything on its own; it can only ask the backend to do something on its behalf.

## Step-by-step log

### M0 — Prove the raw pieces work, alone, before combining them
**What:** two tiny standalone Node scripts. One calls Gemini directly with plain `fetch` — no library. The other connects to MongoDB with the official driver and pings it.
**Why this order:** if something breaks later while building the real app, you already know Gemini and MongoDB each work on their own — so the bug is in how you're wiring them together, not in the services themselves.
**Video:** [Andrej Karpathy — Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g) (1hr, visual, no code — just what an LLM actually is: tokens, context, prompting).

### M1 — A frontend that streams, talking to the AI directly
**What:** a Next.js app using the Vercel AI SDK (`useChat` + `streamText`) to talk to Gemini — no backend yet.
**What changed from M0:** M0 proved the raw API works with hand-written `fetch` and manual JSON parsing. M1 swaps that for a library that handles streaming, retries, and message state for you — the same call, less plumbing.
**Shape at this point:** `Browser → Next.js → Gemini`. No database, no backend.
**Learn:** Vercel Academy's AI SDK course (hands-on, builds this exact thing).

### M2 — Split into a real backend, add a database, teach the AI to use tools
**What:** moved the Gemini call out of Next.js into a new NestJS app. Added MongoDB with 10 fake support tickets. Gave the AI a `lookupTicket` tool so it asks the backend for real data instead of guessing. Added a second, separate call (`generateObject`) that forces the AI's output into a fixed JSON shape instead of free text.
**What changed from M1:** this is the shift from "frontend talks to the AI" to the shape almost every real product actually uses: `frontend → your backend → AI`, with the backend as the only thing allowed to touch real data. Tool calling is what lets the AI *act* on that data instead of only talking about it in the abstract.
**Shape at this point:** the diagram above — this is where the project stands right now.
**Learn:** [Anthropic Academy — Building with the Claude API](https://anthropic.skilljar.com/) (the tool-use lessons — same concept, applies to any provider, not just Claude).

### M3 — next up: RAG *(not started)*
**What it'll add:** a knowledge base of written docs (diagnostic-code FAQs, policies), turned into embeddings and stored in MongoDB, so the AI can answer general questions grounded in real text instead of only looking up specific tickets.
**What it'll change in the diagram:** MongoDB gains a second job — not just tickets, but a searchable knowledge base the backend queries before asking Gemini to answer.

### M4 — next: provider comparison + evaluation *(not started)*

### M5 — next: final polish, docs, demo *(not started)*
