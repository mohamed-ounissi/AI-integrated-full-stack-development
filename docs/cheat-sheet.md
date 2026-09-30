# AI Integration Cheat Sheet

Running reference of the commands and code snippets from this project, kept short enough to copy into your own project if you want to add AI to a TypeScript stack. One section per milestone.

## Setup

Load env vars with no extra dependency (Node 20.6+):
```bash
node --env-file=.env your-script.js
```

`.env` (never commit this — see `.env.example` for the template):
```
GEMINI_API_KEY=...
MONGODB_URI=...
```

## Gemini — raw REST call (no SDK)

Useful when you want to see the actual wire format, or hit the API from a language with no SDK.

**curl:**
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"contents":[{"parts":[{"text":"In one short sentence, confirm you received this message."}]}]}'
```

**Node (`fetch`, built in, no dependency):**
```js
const res = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  },
);
const data = await res.json();
const text = data.candidates[0].content.parts[0].text;
```

Full runnable version: [`scripts/gemini-raw-check.js`](../scripts/gemini-raw-check.js).

Note: Gemini also exposes an OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`), useful if you want to reuse OpenAI-shaped client code against Gemini.

## MongoDB Atlas — connection check

```js
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
await client.db('admin').command({ ping: 1 });
await client.close();
```

Full runnable version: [`scripts/mongo-connection-check.js`](../scripts/mongo-connection-check.js).

## Streaming chat (Vercel AI SDK) — M1

Packages: `ai` `@ai-sdk/react` `@ai-sdk/google` (versions as of Sept 2026: `ai@6`, `@ai-sdk/google@3`).

Note: the AI SDK's own docs pages currently show a different response pattern (`createUIMessageStreamResponse` + `toUIMessageStream` as top-level functions) that does **not** match what `ai@6` actually exports — verified by building against the real installed types. The method that actually exists on the `streamText` result is `.toUIMessageStreamResponse()`. Always check `node_modules/ai/dist/index.d.ts` if a snippet from the docs doesn't compile — the SDK moves fast and docs lag.

**Server (`app/api/chat/route.ts`):**
```ts
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-3.6-flash'), // model names churn fast, check ai.google.dev if this 404s
    messages: await convertToModelMessages(messages), // note: this is async
  });

  return result.toUIMessageStreamResponse();
}
```

**Client (`useChat`):**
```tsx
'use client';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>
          {m.parts.map((p, i) => p.type === 'text' && <span key={i}>{p.text}</span>)}
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); sendMessage({ text: input }); setInput(''); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== 'ready'} />
      </form>
    </>
  );
}
```

**Manual test (no browser, raw SSE stream):**
```bash
curl -s -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"Say hello in exactly three words."}]}]}'
```
Full source: [`apps/frontend/src/app/api/chat/route.ts`](../apps/frontend/src/app/api/chat/route.ts), [`apps/frontend/src/features/chat/chat-page.tsx`](../apps/frontend/src/features/chat/chat-page.tsx).

## NestJS + tool calling + structured output — M2

Packages added: `@nestjs/config` `@nestjs/mongoose` `mongoose` `ai` `@ai-sdk/google` `zod` (same `ai@6` as M1 — same gotcha applies: check `node_modules/ai/dist/index.d.ts` before trusting a docs snippet).

**Tool calling (`ai@6`, field is `inputSchema`, not the older `parameters`):**
```ts
import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: google('gemini-3.6-flash'),
  messages: await convertToModelMessages(messages),
  stopWhen: stepCountIs(5), // lets the model take the tool result and produce a final answer (replaces old `maxSteps`)
  tools: {
    lookupTicket: tool({
      description: 'Look up a support ticket by its numeric ID for real, current status.',
      inputSchema: z.object({ id: z.number() }),
      execute: async ({ id }) => (await ticketsService.findById(id)) ?? { error: `No ticket ${id}` },
    }),
  },
});
```

**Bridging a Fetch `Response` (what `streamText`'s helper returns) into an Express/Nest response** — Nest's default HTTP adapter is Express, which doesn't understand Web `Response`/`ReadableStream` objects natively:
```ts
import { Readable } from 'node:stream';

@Post()
async chat(@Body() body: { messages: UIMessage[] }, @Res() res: Response) {
  const result = streamText({ /* ...as above... */ });
  const webResponse = result.toUIMessageStreamResponse();

  res.status(webResponse.status);
  webResponse.headers.forEach((value, key) => res.setHeader(key, value));
  if (webResponse.body) Readable.fromWeb(webResponse.body as never).pipe(res);
  else res.end();
}
```

**Structured output:**

`generateObject` is deprecated in the `ai@6` line actually installed here — it still runs but logs a deprecation warning. The replacement is `generateText` with an `Output.object(...)` spec:
```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const ticketSummarySchema = z.object({
  title: z.string(),
  keyPoints: z.array(z.string()),
  suggestedAction: z.string(),
});

const { output } = await generateText({
  model: google('gemini-3.6-flash'),
  output: Output.object({ schema: ticketSummarySchema }),
  prompt: `Summarize this support ticket for an agent:\n${JSON.stringify(ticket)}`,
});
// output is guaranteed to match the schema shape — no manual JSON.parse/validate needed
```

**Frontend calling a separate backend instead of its own API route:**
```ts
// src/api/chat.ts
import { DefaultChatTransport } from 'ai';
const transport = new DefaultChatTransport({ api: `${BACKEND_URL}/chat` });
useChat({ transport });
```

Full source: [`apps/backend/src/chat/chat.controller.ts`](../apps/backend/src/chat/chat.controller.ts), [`apps/backend/src/tickets/tickets.service.ts`](../apps/backend/src/tickets/tickets.service.ts), [`apps/frontend/src/api/chat.ts`](../apps/frontend/src/api/chat.ts).

## Embeddings + vector search + RAG — M3

Embedding model: Gemini `gemini-embedding-001` via `@ai-sdk/google` — chosen over Voyage AI specifically to avoid a second API key/account/SDK for a ~4% (vendor-reported) quality difference; free via the same Google AI Studio key already in use. Output dimensions are configurable (Matryoshka: 3072/1536/768) — used 768 here to keep the vector index small.

**Embedding documents vs. embedding a search query use different `taskType`s** — this is a real quality detail, not boilerplate: `RETRIEVAL_DOCUMENT` when storing knowledge-base chunks, `RETRIEVAL_QUERY` when embedding what the user asked, so the two ends of the search are optimized for their asymmetric roles.

```ts
import { embedMany, embed } from 'ai';

// ingesting docs
const { embeddings } = await embedMany({
  model: google.textEmbeddingModel('gemini-embedding-001'),
  values: chunks.map((c) => c.text),
  providerOptions: { google: { outputDimensionality: 768, taskType: 'RETRIEVAL_DOCUMENT' } },
});

// embedding the user's question at query time
const { embedding } = await embed({
  model: google.textEmbeddingModel('gemini-embedding-001'),
  value: query,
  providerOptions: { google: { outputDimensionality: 768, taskType: 'RETRIEVAL_QUERY' } },
});
```

**Creating the Atlas Vector Search index programmatically** (so setup is one script, not a manual Atlas UI step) — idempotent, safe to re-run:
```ts
const existing = await collection.listSearchIndexes('kb_vector_index').toArray();
if (existing.length === 0) {
  await collection.createSearchIndex({
    name: 'kb_vector_index',
    type: 'vectorSearch',
    definition: { fields: [{ type: 'vector', path: 'embedding', numDimensions: 768, similarity: 'cosine' }] },
  });
}
```
Index building is async — right after creation, `listSearchIndexes(...)` returns `queryable: false` for a bit (typically under 2 minutes) before it's ready.

**Querying it** (Mongoose's `.aggregate()` passes `$vectorSearch` straight through to MongoDB):
```ts
const results = await model.aggregate([
  { $vectorSearch: { index: 'kb_vector_index', path: 'embedding', queryVector: embedding, numCandidates: 100, limit: 3 } },
  { $project: { _id: 0, sourceDoc: 1, title: 1, text: 1, score: { $meta: 'vectorSearchScore' } } },
]);
```

**RAG as a tool, not always-on context injection:** consistent with M2's `lookupTicket`, retrieval is exposed as a second tool (`searchKnowledgeBase`) the model calls when it decides it's relevant, rather than always stuffing search results into every prompt. Same mental model as tool calling generally — the backend exposes capabilities, the model decides when to use them.

**Gotcha:** a folder-level `README.md` describing the knowledge-base directory got swept up by a naive `*.md` glob during ingestion and embedded as if it were real content. Filter it out explicitly (or keep docs and folder-notes in physically separate directories).

Full source: [`scripts/ingest-knowledge-base.js`](../scripts/ingest-knowledge-base.js), [`apps/backend/src/knowledge-base/knowledge-base.service.ts`](../apps/backend/src/knowledge-base/knowledge-base.service.ts).

## Multiple providers + evaluation — M4

Packages: `@ai-sdk/groq`, `@ai-sdk/openai-compatible` (for OpenRouter — or anything else with an OpenAI-shaped API, including LM Studio locally).

**Every provider returns the same `LanguageModel`, so switching is one registry entry:**
```ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const models = {
  gemini: createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY })('gemini-3.6-flash'),
  groq: createGroq({ apiKey: GROQ_API_KEY })('openai/gpt-oss-120b'),
  openrouter: createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
  })('qwen/qwen3.8-27b:free'),
  // local: createOpenAICompatible({ name: 'lmstudio', baseURL: 'http://localhost:1234/v1' })('<model>'),
};

streamText({ model: models[provider], system, messages, tools, stopWhen: stepCountIs(5) });
```

**Passing a per-request option from `useChat`** (here: which provider to use):
```ts
chat.sendMessage({ text }, { body: { provider } });
// arrives in the backend as req.body.provider, next to req.body.messages
```

**Find a model that's actually live before hardcoding it** — model IDs and free-tier availability change constantly:
```bash
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
curl -s https://openrouter.ai/api/v1/models   # filter ids ending in ":free" that list "tools" in supported_parameters
```

**Free-tier limits measured here (Sept 2026)** — the thing that actually decides what works:
- Gemini `gemini-3.6-flash`: 5 requests/min, 20/day. A tool-using answer costs 2+ requests → ~10 questions/day.
- Groq `openai/gpt-oss-120b`: no throttling across four eval runs, ~1.4 s per answer.
- OpenRouter `:free` models: shared upstream pools — some 429/503 at random; test a few.

**A minimal eval is ~150 lines:** send fixed questions to your real endpoint, read the stream, check required keywords and which tool was called, time it. Normalize the text first — models emit narrow no-break spaces (`4 hours`), non-breaking hyphens (`24‑month`) and subscripts (`O₂`) that break plain `includes()` checks:
```js
const normalize = (t) =>
  t.replace(/[‐-―]/g, '-').replace(/[    ]/g, ' ').replace(/₂/g, '2').toLowerCase();
```

Full source: [`apps/backend/src/ai/ai.module.ts`](../apps/backend/src/ai/ai.module.ts), [`scripts/eval.js`](../scripts/eval.js).
