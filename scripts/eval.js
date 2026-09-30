// M4: run 10 fixed questions through the real /chat endpoint (tools + RAG included)
// for each configured provider, and score them. Needs the backend running.
// Run: node scripts/eval.js            (all providers the backend has keys for)
//      node scripts/eval.js groq       (just one)
//      PAUSE_MS=25000 node scripts/eval.js gemini   (Gemini's free tier is 5 requests/min,
//                                                    and each tool-using answer costs 2+)

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const PAUSE_BETWEEN_QUESTIONS_MS = Number(process.env.PAUSE_MS ?? 1500);

// Each `keywords` entry must appear in the answer (case-insensitive).
// An array entry means "any one of these spellings counts".
const QUESTIONS = [
  { q: 'What does diagnostic code P0420 mean?', keywords: ['catalytic', ['oxygen sensor', 'o2 sensor']], tool: 'searchKnowledgeBase' },
  { q: 'What is the most common cause of code P0455?', keywords: ['fuel cap'], tool: 'searchKnowledgeBase' },
  { q: 'Is it safe to keep driving with code P0128, and what usually causes it?', keywords: ['thermostat', 'safe'], tool: 'searchKnowledgeBase' },
  { q: 'How long is the full-replacement battery warranty?', keywords: [['24 month', '24-month', '24 months']], tool: 'searchKnowledgeBase' },
  { q: 'What response window should I promise a customer calling for a tow after hours?', keywords: ['45', '75'], tool: 'searchKnowledgeBase' },
  { q: 'Up to how long before an appointment can a customer cancel for free?', keywords: [['4 hours', 'four hours', '4-hour']], tool: 'searchKnowledgeBase' },
  { q: 'A customer hears grinding when braking. How urgent is that?', keywords: [['rotor', 'metal']], tool: 'searchKnowledgeBase' },
  { q: 'What is the status of ticket 4 and who is it assigned to?', keywords: [['in progress', 'in_progress'], ['agent_2', 'agent 2']], tool: 'lookupTicket' },
  { q: 'What issue was reported on ticket 8?', keywords: ['P0420'], tool: 'lookupTicket' },
  { q: 'Who is the customer on ticket 2?', keywords: ['Karim'], tool: 'lookupTicket' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getProviders(requested) {
  const res = await fetch(`${BACKEND_URL}/chat/providers`);
  if (!res.ok) throw new Error(`Backend not reachable at ${BACKEND_URL} (${res.status})`);
  const all = await res.json();
  return requested.length ? all.filter((p) => requested.includes(p.id)) : all;
}

// Reads the AI SDK's SSE stream and pulls out the answer text, tool calls, timing and errors.
async function ask(provider, question) {
  const started = performance.now();
  let firstTokenMs = null;
  let text = '';
  const tools = [];
  const errors = [];

  const res = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: question }] }],
    }),
  });
  if (!res.ok) {
    return { text, tools, errors: [`HTTP ${res.status}`], firstTokenMs, totalMs: performance.now() - started };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text-delta') {
        firstTokenMs ??= performance.now() - started;
        text += event.delta;
      } else if (event.type === 'tool-input-available') {
        tools.push(event.toolName);
      } else if (event.type === 'error') {
        errors.push(event.errorText);
      }
    }
  }

  return { text, tools, errors, firstTokenMs, totalMs: performance.now() - started };
}

// Some models write "4 hours" with a narrow no-break space, "24‑month" with a
// non-breaking hyphen, or "O₂" with a subscript; without this, correct answers
// fail a plain substring match.
function normalize(text) {
  return text
    .replace(/[‐-―]/g, '-')
    .replace(/[    ]/g, ' ')
    .replace(/₂/g, '2')
    .toLowerCase();
}

function score(answer, keywords) {
  const lower = normalize(answer);
  const missing = keywords.filter((k) => ![k].flat().some((alt) => lower.includes(normalize(alt))));
  return { passed: missing.length === 0, missing: missing.map((k) => [k].flat()[0]) };
}

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

async function evalProvider({ id, model }) {
  console.log(`\n=== ${id} (${model}) ===`);
  const rows = [];
  for (const [i, item] of QUESTIONS.entries()) {
    const result = await ask(id, item.q);
    const { passed, missing } = score(result.text, item.keywords);
    const toolOk = result.tools.includes(item.tool);
    rows.push({ ...result, passed, toolOk });
    const status = passed ? 'PASS' : 'FAIL';
    const detail = result.errors.length ? `error: ${result.errors[0]}` : missing.length ? `missing: ${missing.join(', ')}` : '';
    console.log(
      `${String(i + 1).padStart(2)}. ${status}  tool:${toolOk ? 'ok ' : 'no '} ${Math.round(result.totalMs)}ms  ${item.q}  ${detail}`,
    );
    await sleep(PAUSE_BETWEEN_QUESTIONS_MS);
  }
  return {
    id,
    model,
    passed: rows.filter((r) => r.passed).length,
    toolOk: rows.filter((r) => r.toolOk).length,
    errors: rows.filter((r) => r.errors.length).length,
    avgFirstTokenMs: avg(rows.map((r) => r.firstTokenMs).filter((x) => x != null)),
    avgTotalMs: avg(rows.map((r) => r.totalMs)),
  };
}

async function main() {
  const providers = await getProviders(process.argv.slice(2));
  if (!providers.length) throw new Error('No matching providers configured on the backend');

  const summaries = [];
  for (const provider of providers) summaries.push(await evalProvider(provider));

  console.log('\n=== Summary ===');
  console.table(
    summaries.map((s) => ({
      provider: s.id,
      model: s.model,
      passed: `${s.passed}/${QUESTIONS.length}`,
      'right tool': `${s.toolOk}/${QUESTIONS.length}`,
      errors: s.errors,
      'avg first token (ms)': s.avgFirstTokenMs,
      'avg total (ms)': s.avgTotalMs,
    })),
  );
}

main().catch((err) => {
  console.error('Eval failed:', err.message);
  process.exit(1);
});
