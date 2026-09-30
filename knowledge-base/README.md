# Knowledge base

The documents the copilot answers from: 5 diagnostic codes (`diagnostic-*`), 5 service policies (`policy-*`) and 10 agent FAQs (`faq-*`). All fictional, written for this project.

To add or change content, edit or add a `.md` file here (first line `# Title`, then plain paragraphs) and re-run:

```bash
node --env-file=.env scripts/ingest-knowledge-base.js
```

The script chunks each doc by paragraph, embeds the chunks with Gemini, replaces `autocare.kb_chunks`, and creates the vector index if it doesn't exist. This README is skipped.
