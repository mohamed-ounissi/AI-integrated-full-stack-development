# AutoCare Copilot — Training Plan

Approved training project: **AI-integrated full-stack development** (LLM API integration, RAG, vector search) on the Next.js / NestJS / MongoDB stack. Deliverables at the end: a working PoC + documentation + a short demo video.

## 1. My take on the topic

Good pick for 2026. Companies aren't hiring people to train models — they're hiring engineers who can wire an LLM into a real product safely: auth, streaming, a database, error handling, cost limits. That's exactly what this plan builds, on the exact stack you already use at work, so it transfers directly. The part that actually differentiates a candidate right now isn't "I did RAG" (that's table stakes by now) — it's whether you can also *evaluate* the thing (does it actually answer correctly?) and use tool calling / structured output to make the model take safe, constrained actions instead of free-texting into your database. This plan includes both, not just retrieval.

## 2. The project: "AutoCare Copilot"

An AI support copilot for auto-service / roadside-assistance teams — inspired by the kind of product Autorouto is, but **entirely new code, not a fork or reuse of Autorouto's codebase**. This is a fictional, standalone domain: vehicles, service tickets, diagnostic-code FAQs.

Why this shape: it naturally needs every skill in the approved plan —
- **Streaming chat** — agent-facing chat UI.
- **RAG** — answers grounded in a small knowledge base of car manuals / diagnostic-code FAQs (you write these yourself, ~15–20 short docs).
- **Tool calling** — the model looks up a vehicle or ticket by ID from MongoDB instead of hallucinating one.
- **Structured output** — the model drafts a ticket-reply/summary as `{ title, keyPoints[], suggestedAction }`, validated with Zod, never raw prose into the DB.
- **Evaluation** — a small fixed question set with expected answers, scored automatically.

It's realistic enough to be a genuine CV/demo piece, and close enough to Rooly's domain that your manager will immediately see the relevance without you touching any real client code.

## 3. Constraint: work laptop now, personal PC later

Your work laptop likely can't run local models well, so **Milestones 0–5 use a free cloud API only**. Local LM Studio is a **stretch milestone (M6)** for when you're back on your personal PC — the AI SDK makes that a provider swap, not a rewrite, so nothing here is wasted.

Free cloud API options confirmed still available (Sept 2026), no credit card needed:
- **Google Gemini (Google AI Studio)** — generous free tier (Gemini Flash), multimodal, easiest to set up. **Recommended default.**
- **Groq** — free tier, extremely fast inference (good for the streaming demo feel).
- **OpenRouter** — 20+ free models behind one API key, useful for Day 4/M4's "compare providers" step even without local.

Pick Gemini as your main provider, keep Groq or OpenRouter as the second provider for the comparison milestone.

## 4. Tooling checklist (do this before Milestone 0)

- [ ] Node.js LTS + pnpm (`corepack enable`)
- [ ] VS Code with Claude Code configured (already have this)
- [ ] Git — this repo is already initialized
- [ ] A Google AI Studio API key (Gemini) — free, no card
- [ ] A Groq **or** OpenRouter API key (free) — for the M4 comparison
- [ ] MongoDB Atlas free **M0 cluster** (supports Atlas Vector Search) — free, no card required for M0 tier
- [ ] MongoDB Compass (GUI, optional but helpful)
- [ ] NestJS CLI: `npm i -g @nestjs/cli`
- [ ] (Stretch/M6, personal PC only) LM Studio + a ~7-8B instruct model + `nomic-embed-text-v1.5`

## 5. Learning resources (verified free, Sept 2026)

| Resource | Covers | Cost | Certificate/Badge |
|---|---|---|---|
| [Vercel Academy — Builders Guide to the AI SDK](https://vercel.com/academy/ai-sdk) | Streaming, structured output, tool calling, TS-first | Free, ~12h video+hands-on | No cert, but this is your main "how to build" track |
| [Anthropic Academy — Building with the Claude API](https://anthropic.skilljar.com/) | LLM fundamentals, prompting, tool use, RAG concepts, eval | Free, ~8h video | **Yes — shareable certificate** |
| [MongoDB University — Atlas Vector Search Fundamentals](https://learn.mongodb.com/courses/vector-search-fundamentals) | Embeddings, vector index, semantic search | Free, ~1h | **Yes — Credly badge** |
| [MongoDB University — RAG with MongoDB](https://learn.mongodb.com/courses/rag-with-mongodb) | Full RAG pipeline on MongoDB | Free, ~1h | **Yes — Credly badge** |

That's the full combo: Vercel Academy to build, MongoDB University for two badges, Anthropic Academy for a full certificate — no paid step anywhere, ~22h total video/hands-on, fits comfortably in a week.

## 6. Milestones — gated, in order

Each milestone has a **Definition of Done**. Don't start the next milestone until the current one's DoD is checked off — that's the "finish one to unlock the next" structure you asked for.

### M0 — Environment ready
- **Do:** Everything in the tooling checklist above. Send one raw request to Gemini with `curl` or a 5-line Node script and see a response come back.
- **DoD:** ✅ Gemini key works from a terminal script. ✅ MongoDB Atlas M0 cluster is reachable from Compass.

### M1 — Streaming chat fundamentals
- **Learn:** Vercel Academy "Foundations" + "Conversational AI" modules. For the "Introduction to LLMs" page specifically, swap in [Andrej Karpathy — Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g) (1hr, visual/slide-based) if you prefer video over docs — same concepts, tokens/context/prompting, product-level.
- **Build:** `npx create-next-app@latest` in `apps/frontend`. A single chat page using `useChat` + `streamText`, wired to Gemini via `@ai-sdk/google`.
- **DoD:** ✅ You can type a message and see the AI's reply stream token-by-token in the browser.

### M2 — NestJS backend, structured output, tool calling
- **Learn:** Vercel Academy "Invisible AI" module (structured output, tools) + Anthropic Academy's tool-use lessons.
- **Build:** `nest new` in `apps/backend`. Move the LLM call server-side behind a streaming NestJS endpoint. Add:
  - one **tool**: "look up a ticket/vehicle by ID" (reads a MongoDB collection you seed with ~10 fake records),
  - one **structured-output** endpoint: draft a ticket summary as `{ title, keyPoints[], suggestedAction }` validated with Zod.
- **DoD:** ✅ Frontend calls the NestJS backend, which calls Gemini. ✅ Asking "what's the status of ticket #4" returns a real looked-up record, not a hallucinated one. ✅ The summary endpoint always returns valid, schema-shaped JSON.

### M3 — Embeddings, vector search, RAG
- **Learn:** MongoDB University "Vector Search Fundamentals" + "RAG with MongoDB" (both badges, ~2h total).
- **Build:** Write 15–20 short knowledge-base docs (`knowledge-base/`) — diagnostic-code FAQs, service-policy snippets. Chunk them, embed with Gemini's embedding model, store vectors in MongoDB Atlas, create a vector search index, retrieve top matches, pass as context to the chat endpoint.
- **DoD:** ✅ Asking a knowledge-base question (e.g. "what does code P0420 mean?") returns an answer grounded in your own docs, with the source doc referenced.

### M4 — Provider comparison + evaluation
- **Build:** Run the same RAG flow through Gemini and through your second provider (Groq or OpenRouter). Compare answer quality, latency, and any rate-limit friction in a small table. Write 10 fixed test questions with expected answers; score how many each provider gets right (a basic eval harness — a script, not a framework).
- **DoD:** ✅ A filled-in comparison table. ✅ An eval script that prints a pass/fail count for both providers.

### M5 — Final PoC polish + documentation + demo
- **Build:** Tie the pieces together into one coherent app (chat + tool calling + RAG + structured summaries). Write up `docs/architecture.md`, `docs/comparison.md` (from M4), `docs/evaluation.md` (from M4), limitations, and next steps. Record a 3–5 min demo video.
- **DoD:** ✅ App runs end-to-end from a clean clone + `README.md` setup steps. ✅ Docs and demo video ready to send to your manager.

### M6 — Stretch, personal PC only: local models
- **Do:** Install LM Studio, load a chat model + `nomic-embed-text-v1.5`, swap the AI SDK provider from Gemini to the OpenAI-compatible LM Studio endpoint, re-run the same comparison from M4 with "local" as a third column.
- **DoD:** ✅ Comparison table now includes local: quality, speed, privacy, hardware needs.

## 7. Deliverable checklist (send to manager)

- [ ] Working PoC (repo, runnable from README)
- [ ] `docs/architecture.md`
- [ ] `docs/comparison.md` (providers, + local once on personal PC)
- [ ] `docs/evaluation.md`
- [ ] 3–5 min demo video
- [ ] Anthropic Academy certificate
- [ ] MongoDB University badges (Vector Search Fundamentals, RAG with MongoDB)
