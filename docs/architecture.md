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
│  decides which "tools" the AI is allowed to call:                    │
│  lookupTicket, searchKnowledgeBase                                    │
└───────────┬─────────────────────────────┬──────────────────────---──┘
            │                              │
            │ "get the real ticket #9      │ "read this message, decide
            │  data" or "search the KB     │  if a tool is needed, then
            │  for a grounded answer"      │  write the reply, or embed
            ▼                              │  some text into a vector"
┌────────────────────────────────┐          ▼
│  MongoDB Atlas                    │  ┌────────────────────────┐
│  autocare.tickets                 │  │  Google Gemini            │
│  autocare.kb_chunks (vectors)     │  │  via the Vercel AI SDK    │
│  the only source of truth          │  │  chat + embeddings,       │
│  for real data and searchable KB    │  │  understands language,   │
└────────────────────────────────┘  │  decides what to do next │
                                        └────────────────────────┘
```

Three boxes, three jobs, don't mix them up:
- **Frontend (Next.js)** — display only. It has no idea AI or a database exist. It sends the conversation to the backend and renders whatever streams back.
- **Backend (NestJS)** — the only thing that talks to Gemini *and* MongoDB. This is the important part: **the AI never touches the database directly.** The backend hands Gemini a fixed "menu of tools" (`lookupTicket`, `searchKnowledgeBase`). Gemini can only get real data by asking for one of those tools to run, and the backend is the one that actually executes it against MongoDB and hands the result back.
- **AI (Gemini, called through the Vercel AI SDK)** — only understands language and makes decisions. It can't reach anything on its own; it can only ask the backend to do something on its behalf. It's also used for a second, unrelated job now: turning text into embeddings (a list of numbers capturing meaning) so MongoDB can search by similarity instead of by exact match.

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
**What:** moved the Gemini call out of Next.js into a new NestJS app. Added MongoDB with 10 fake support tickets. Gave the AI a `lookupTicket` tool so it asks the backend for real data instead of guessing. Added a second, separate call that forces the AI's output into a fixed JSON shape (validated against a schema) instead of free text.
**What changed from M1:** this is the shift from "frontend talks to the AI" to the shape almost every real product actually uses: `frontend → your backend → AI`, with the backend as the only thing allowed to touch real data. Tool calling is what lets the AI *act* on that data instead of only talking about it in the abstract.
**Shape at this point:** the diagram above — this is where the project stands right now.
**Learn:** [Anthropic Academy — Building with the Claude API](https://anthropic.skilljar.com/) (the tool-use lessons — same concept, applies to any provider, not just Claude).

### M3 — Embeddings, vector search, RAG
**What:** wrote 20 short knowledge-base docs (diagnostic-code explanations, service policies, FAQs). A one-off script chunks them, embeds each chunk with Gemini's embedding model, stores the vectors in a new `autocare.kb_chunks` collection, and creates an Atlas Vector Search index over it. Gave the AI a second tool, `searchKnowledgeBase`, alongside `lookupTicket`.
**What changed from M2:** M2 taught the AI to fetch one *exact* record by ID — a lookup. M3 teaches it to find the *most relevant* unstructured text for a fuzzy question — that's the real difference between a lookup and RAG: a lookup needs an exact key, retrieval needs a similarity search over meaning, which is what embeddings + vector search provide. Same tool-calling pattern as M2 either way — the model just gets a second tool to choose from.
**Design choice worth knowing:** used Gemini's own embedding model (`gemini-embedding-001`) rather than a separate provider like Voyage AI — free via the same key already in use, and the quality gap (~4%, per Voyage's own reported benchmark) wasn't worth a second account/SDK for a 20-doc knowledge base. Also: documents and queries are embedded with different `taskType`s (`RETRIEVAL_DOCUMENT` vs `RETRIEVAL_QUERY`) — a real quality detail for asymmetric search, not boilerplate.
**Shape at this point:** MongoDB now holds two different kinds of data doing two different jobs — exact records (`tickets`) and searchable knowledge (`kb_chunks`) — and Gemini is called for two different purposes: chat/decisions, and turning text into embeddings.
**Learn:** MongoDB University's "Vector Search Fundamentals" + "RAG with MongoDB" (both badges, ~2h).

### M4 — next: provider comparison + evaluation *(not started)*

### M5 — next: final polish, docs, demo *(not started)*
