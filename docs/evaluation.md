# Evaluation

A deliberately small eval harness — one script, no framework: [`scripts/eval.js`](../scripts/eval.js).

## How it works

1. Sends each question to the real `POST /chat` endpoint (so tools, retrieval and the system prompt are all exercised), once per provider.
2. Reads the streamed response and records the answer text, which tools were called, time to first token, total time, and any stream errors.
3. Scores each answer: **pass** if every required keyword appears (case-insensitive; some accept alternative spellings). Separately checks whether the expected tool was called.

```bash
# backend must be running
node scripts/eval.js                         # every provider the backend has a key for
node scripts/eval.js groq                    # just one
PAUSE_MS=25000 node scripts/eval.js gemini   # pace for Gemini's 5 req/min free tier
```

## The 10 questions

| # | Question | Must mention | Expected tool |
|---|---|---|---|
| 1 | What does diagnostic code P0420 mean? | catalytic; oxygen sensor / O2 sensor | searchKnowledgeBase |
| 2 | What is the most common cause of code P0455? | fuel cap | searchKnowledgeBase |
| 3 | Is it safe to keep driving with code P0128, and what usually causes it? | thermostat; safe | searchKnowledgeBase |
| 4 | How long is the full-replacement battery warranty? | 24 months | searchKnowledgeBase |
| 5 | What response window should I promise a customer calling for a tow after hours? | 45; 75 | searchKnowledgeBase |
| 6 | Up to how long before an appointment can a customer cancel for free? | 4 hours | searchKnowledgeBase |
| 7 | A customer hears grinding when braking. How urgent is that? | rotor / metal | searchKnowledgeBase |
| 8 | What is the status of ticket 4 and who is it assigned to? | in progress; agent_2 | lookupTicket |
| 9 | What issue was reported on ticket 8? | P0420 | lookupTicket |
| 10 | Who is the customer on ticket 2? | Karim | lookupTicket |

Seven questions exercise RAG over the knowledge base, three exercise exact lookups over ticket records.

## Results (final runs)

| Provider | Passed | Right tool | Stream errors | Avg first token | Avg total |
|---|---|---|---|---|---|
| Groq — `openai/gpt-oss-120b` | **10/10** | 10/10 | 0 | 1.27 s | 1.42 s |
| OpenRouter — `qwen/qwen3.8-27b:free` | 9/10 | 9/10 | 1 (429) | 4.35 s | 6.18 s |
| Gemini — `gemini-3.6-flash` | 5/10 | 6/10 | 5 (quota) | 4.01 s | 5.61 s |

Every Gemini "fail" was a free-tier quota error, not a wrong answer: across two runs it answered 7 distinct questions and got all 7 right. See [comparison.md](./comparison.md) for the rate-limit details.

## What the harness itself got wrong (and how it was fixed)

Two rounds of "failures" were scoring bugs, not model mistakes — worth knowing before trusting any keyword-based eval:

- **Typography.** `gpt-oss` writes "4 hours" with a narrow no-break space (U+202F), "24‑month" with a non-breaking hyphen (U+2011), and "O₂ sensor" with a subscript. A plain substring match failed all three even though the answers were right. The scorer now normalizes Unicode spaces, hyphens and subscript digits before matching, and Q1 accepts "O2 sensor".
- **Run-to-run variance.** The same provider on the same questions scored 8, 9 and 10 across runs (before and after the fixes above). A single run is a sample, not a verdict; for a real decision, run each provider several times and compare the spread.

## Limits of this eval

- Keyword matching checks that the key facts are present, not that the answer is well-written or free of extra, wrong claims. A next step would be an LLM-as-judge pass that grades each answer against the source doc.
- 10 questions is enough to catch a broken setup and compare providers roughly — not enough to measure small quality differences.
