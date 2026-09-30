# Architecture & Build Log

Two things live in this one file: the big picture (how the pieces connect) and a step-by-step log of what was added at each milestone and why.

## The big picture

```
 Support agent (browser)
     │
     │ types a question, picks a model, or clicks "Summarize" on a ticket
     ▼
┌──────────────────────┐   useChat() streams the reply back, token by token
│  Next.js               │◄─────────────────────────────────────────────┐
│  (apps/frontend)        │                                              │
│  display only —         │                                              │
│  no AI or DB logic       │                                              │
└──────────┬──────────────┘                                              │
           │ POST /chat { messages, provider }   POST /tickets/:id/summary │
           ▼                                                             │
┌─────────────────────────────────────────────────────────────────────┐ │
│  NestJS backend (apps/backend)                                         │ │
│  the only piece that talks to the AI providers and the database        │─┘
│  gives the model a fixed menu of tools: lookupTicket, searchKnowledgeBase │
└───────────┬──────────────────────────────┬───────────────────────────┘
            │                               │
            │ exact ticket lookups,         │ chat + tool decisions (picked per request),
            │ vector search over the KB     │ structured summaries, embeddings
            ▼                               ▼
┌──────────────────────────────┐   ┌───────────────────────────────────────┐
│  MongoDB Atlas                  │   │  Vercel AI SDK — one API, many providers │
│  autocare.tickets                │   │  Groq     gpt-oss-120b   (default chat)  │
│  autocare.kb_chunks (+ vectors)  │   │  Gemini   gemini-3.6-flash (fallback)     │
│  Atlas Vector Search index        │   │  OpenRouter qwen3.8-27b                 │
└──────────────────────────────┘   │  Gemini   gemini-embedding-001 (embeddings)│
                                       └───────────────────────────────────────┘
```

Three boxes, three jobs, don't mix them up:

- **Frontend (Next.js)** — display only. It sends the conversation (and which model to use) to the backend and renders whatever streams back, including which tools the model called and which knowledge-base docs it used.
- **Backend (NestJS)** — the only thing that talks to the AI providers *and* MongoDB. **The AI never touches the database directly.** The backend hands the model a fixed menu of tools; the model can only get real data by asking for one of them, and the backend is what actually runs it against MongoDB and hands the result back.
- **AI (through the Vercel AI SDK)** — understands language and decides what to do next. Because every provider sits behind the same SDK interface, switching model is one entry in a registry, not a rewrite. Embeddings are a separate job (turning text into vectors so MongoDB can search by meaning) and stay on Gemini's embedding model.



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
**Learn:** [Anthropic Academy — Building with the Claude API](https://anthropic.skilljar.com/) (the tool-use lessons — same concept, applies to any provider, not just Claude).

### M3 — Embeddings, vector search, RAG

**What:** wrote 20 short knowledge-base docs (diagnostic-code explanations, service policies, FAQs). A one-off script chunks them, embeds each chunk with Gemini's embedding model, stores the vectors in a new `autocare.kb_chunks` collection, and creates an Atlas Vector Search index over it. Gave the AI a second tool, `searchKnowledgeBase`, alongside `lookupTicket`.
**What changed from M2:** M2 taught the AI to fetch one *exact* record by ID — a lookup. M3 teaches it to find the *most relevant* unstructured text for a fuzzy question — that's the real difference between a lookup and RAG: a lookup needs an exact key, retrieval needs a similarity search over meaning, which is what embeddings + vector search provide. Same tool-calling pattern as M2 either way — the model just gets a second tool to choose from.
**Design choice worth knowing:** used Gemini's own embedding model (`gemini-embedding-001`) rather than a separate provider like Voyage AI — free via the same key already in use, and the quality gap (~4%, per Voyage's own reported benchmark) wasn't worth a second account/SDK for a 20-doc knowledge base. Also: documents and queries are embedded with different `taskType`s (`RETRIEVAL_DOCUMENT` vs `RETRIEVAL_QUERY`) — a real quality detail for asymmetric search, not boilerplate.
**Learn:** MongoDB University's "Vector Search Fundamentals" + "RAG with MongoDB" (both badges, ~2h).

### M4 — Compare providers, and measure instead of guessing

**What:** the backend now holds a small registry of chat models — Gemini, Groq (`openai/gpt-oss-120b`) and OpenRouter (`qwen/qwen3.8-27b:free`) — and each chat request says which one to use. A shared system prompt tells every model the same rules (use the tools, cite the source doc, don't invent). An eval script sends 10 fixed questions through the real `/chat` endpoint for each provider and scores them. Results: [comparison.md](./comparison.md), [evaluation.md](./evaluation.md).
**What changed from M3:** until now "does it work?" meant trying a question by hand. M4 turns that into a repeatable measurement — and the measurement changed a decision: Gemini answered correctly every time it answered, but its free tier (5 requests/min, 20/day) can't sustain a tool-using assistant, so **Groq became the default** for chat and summaries. Gemini stays for embeddings.
**Worth knowing:** the eval found its own bugs first. Two rounds of "failures" were the scorer tripping on Unicode (a narrow no-break space in "4 hours", a subscript in "O₂ sensor"), not wrong answers. Check why something failed before believing the number.
**Learn:** [Vercel AI SDK — Providers and Models](https://ai-sdk.dev/docs/foundations/providers-and-models) (why swapping providers is a one-line change).

### M5 — One coherent app

**What:** redesigned the frontend into the tool an agent would actually use: a ticket panel (status badges, details, one-click **structured summary**, "Ask Copilot" about a ticket), a chat that renders markdown and shows which tools ran and which knowledge-base docs were used, a model picker, suggested questions, stop/new-chat controls, dark mode and a mobile layout. Collapsed setup to one root `.env` shared by the backend and scripts. Rewrote the READMEs for a clean-clone setup.
**What changed from M4:** every feature from M1–M4 is now reachable from one screen, and a reviewer can see *why* an answer is trustworthy (the tool and source chips) without reading the code.

## Limitations

- **No authentication.** Anyone who can reach the backend can read tickets and spend the AI quota. Fine for a local PoC, not for deployment.
- **Free-tier quotas decide what works.** Gemini's chat quota runs out in ~10 questions/day; OpenRouter's free pool throttles intermittently. The UI surfaces the error and lets you switch model, but a real deployment needs paid keys.
- **The knowledge base is tiny and hand-written** (20 docs). Chunking is paragraph-based, which is fine at this size but would need revisiting for long PDFs or manuals.
- **Conversations aren't saved** — refreshing the page clears the chat.
- **Retrieval always returns the top 3 chunks**, even when only one is relevant; there's no relevance threshold yet.
- **The eval is small and keyword-based** — good for catching regressions and rough comparison, not for fine quality judgments.



## Next steps

1. Add auth.
2. Persist conversations per agent/ticket in MongoDB.
3. Add a relevance cut-off on vector search scores, and hybrid search (keyword + vector) for exact codes like `P0420`.
4. Ingest real documents (PDF manuals) with a proper chunker.
5. Grade answers with an LLM-as-judge against the source doc, not just keywords.
6. Run the same eval against a local model (LM Studio) on a machine with a GPU — the provider registry already supports it.

