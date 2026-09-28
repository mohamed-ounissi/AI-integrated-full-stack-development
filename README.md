# AutoCare Copilot

AI training project (approved 1-week learning plan): an AI support copilot for auto-service / roadside-assistance teams, built on Next.js + NestJS + MongoDB with streaming chat, tool calling, structured output, and RAG.

See [PLAN.md](./PLAN.md) for the full gated milestone plan, learning resources, and setup checklist — start there.

## Structure

```
apps/
  frontend/       # Next.js app — created in Milestone 1
  backend/        # NestJS app — created in Milestone 2
knowledge-base/   # RAG source docs — written in Milestone 3
docs/             # architecture.md (the log — see below), cheat-sheet.md, comparison.md, evaluation.md
scripts/          # Standalone check/utility scripts (M0 onward)
```

## The two docs that matter most

- [docs/architecture.md](./docs/architecture.md) — **the main one.** A plain-language picture of how the frontend, backend, database, and AI connect, plus a step-by-step log of what was added at each milestone and why. Updated as you go, not just at the end.
- [docs/cheat-sheet.md](./docs/cheat-sheet.md) — the short, copy-pasteable code snippets and commands, meant to eventually hand to a colleague who wants to add AI to their own project.

## Status

M0 and M1 and M2 done. See docs/architecture.md for what that means and what's next.
