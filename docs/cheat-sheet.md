# AI Integration Cheat Sheet

Running reference of the commands and code snippets from this project, kept short enough to paste into Slack or hand to a colleague who wants to add AI to their own project. One section per milestone — keep appending as you go, don't rewrite what's already here.

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

## NestJS + tool calling + structured output — *(added in M2)*

## Embeddings + vector search + RAG — *(added in M3)*

## Provider comparison + evaluation — *(added in M4)*
