# Provider comparison

All three providers ran the **same flow**: same system prompt, same two tools (`lookupTicket`, `searchKnowledgeBase`), same retrieval (Gemini embeddings + MongoDB Atlas Vector Search), and the same 10 questions from [`scripts/eval.js`](../scripts/eval.js). Only the chat model changes. Measured 2026-09-29/30 on free tiers.

| | **Gemini** | **Groq** | **OpenRouter** |
|---|---|---|---|
| Model | `gemini-3.6-flash` | `openai/gpt-oss-120b` | `qwen/qwen3.8-27b:free` |
| Eval score (final run) | 5/10 — every failure was a quota error | **10/10** | 9/10 (one 429) |
| Correct when it answered | 7/7 distinct questions across two runs | 10/10 | 10/10 |
| Picked the right tool | 6/6 when it answered | 10/10 | 10/10 when it answered |
| Avg time to first token | ~4.0 s | **~1.3 s** | 4.4 – 7.2 s |
| Avg full answer | ~5.5 s | **~1.4 s** (up to ~4 s on a busy run) | 6.2 – 12.8 s |
| Free-tier limits hit | **5 requests/min and 20 requests/day** per model | none during testing | shared upstream pool, intermittent 429s |
| Structured output (ticket summary) | works | works (~1.2 s) | not tested |
| Setup | same Google AI Studio key as embeddings | separate key, no card | separate key, no card |

## Rate-limit friction — the finding that mattered most

- **Gemini's free tier is too small for a tool-using assistant.** `gemini-3.6-flash` is capped at 5 requests/minute and 20/day. A tool-using answer costs at least two model calls (decide to call the tool → answer with the result), so that's ~2 questions/minute and ~10 questions/day. The first eval run (one question every 1.5 s) failed 5 of 10 on the per-minute cap; a paced run (one question every 25 s) got 5 in before hitting the daily cap. The quality was fine — the quota wasn't.
- **Groq never throttled** across four full runs plus UI testing, and was 3–4× faster than the others.
- **OpenRouter's free models share upstream capacity.** Several were unusable at test time: `google/gemma-4-31b-it:free` (429, shared Google AI Studio pool), `nvidia/nemotron-3-super-120b-a12b:free` (503, overloaded), `thinkingmachines/inkling:free` (403, restricted to agent harnesses). `qwen/qwen3.8-27b:free` worked, with an occasional 429.

## Decision

The backend defaults to **Groq** when `GROQ_API_KEY` is set (chat and ticket summaries), and falls back to Gemini otherwise. Gemini stays in use for **embeddings** (`gemini-embedding-001`), which have their own, larger quota and weren't affected. All three remain selectable in the UI's model picker.

For a paid deployment the ranking could change — Gemini's quality was never the problem, only its free quota — so this should be re-run on paid tiers before a production decision.

## Local models (not yet measured)

Running a model locally through LM Studio is planned as a stretch step on a machine with enough RAM/GPU. The AI SDK makes it one more entry in the provider registry (`createOpenAICompatible` pointed at `http://localhost:1234/v1`), and `node scripts/eval.js local` would produce the fourth column.
