// M3: chunk the knowledge-base docs, embed them with Gemini, store the vectors in
// MongoDB Atlas, and (re)create the Atlas Vector Search index they're queried through.
// Run: node --env-file=.env scripts/ingest-knowledge-base.js

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '..', 'knowledge-base');
const EMBEDDING_DIMENSIONS = 768;
const VECTOR_INDEX_NAME = 'kb_vector_index';
const MAX_CHUNK_CHARS = 800;

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Run with: node --env-file=.env scripts/ingest-knowledge-base.js`);
  }
  return value;
}

async function loadDocs() {
  const files = (await readdir(KNOWLEDGE_BASE_DIR)).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const docs = [];
  for (const file of files) {
    const raw = await readFile(path.join(KNOWLEDGE_BASE_DIR, file), 'utf-8');
    const [firstLine, ...rest] = raw.trim().split('\n');
    docs.push({
      sourceDoc: file,
      title: firstLine.replace(/^#+\s*/, ''),
      body: rest.join('\n').trim(),
    });
  }
  return docs;
}

// Splits on blank lines and merges paragraphs back together up to maxChars,
// so a chunk never cuts a paragraph in half. Most of these docs are short
// enough to end up as a single chunk — that's fine, they're already one
// focused topic each; this just keeps longer docs from becoming one giant chunk.
function chunkText(text, maxChars = MAX_CHUNK_CHARS) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function buildChunkRecords(docs) {
  const records = [];
  for (const doc of docs) {
    const chunks = chunkText(doc.body);
    chunks.forEach((text, i) => {
      records.push({ sourceDoc: doc.sourceDoc, title: doc.title, text, chunkIndex: i });
    });
  }
  return records;
}

async function embedChunks(records) {
  const google = createGoogleGenerativeAI({ apiKey: getEnv('GEMINI_API_KEY') });

  const { embeddings } = await embedMany({
    model: google.textEmbeddingModel('gemini-embedding-001'),
    values: records.map((r) => r.text),
    providerOptions: {
      google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: 'RETRIEVAL_DOCUMENT' },
    },
  });

  return records.map((record, i) => ({ ...record, embedding: embeddings[i] }));
}

async function storeChunks(client, chunksWithEmbeddings) {
  const collection = client.db('autocare').collection('kb_chunks');
  await collection.deleteMany({});
  await collection.insertMany(chunksWithEmbeddings);
}

async function ensureVectorIndex(client) {
  const collection = client.db('autocare').collection('kb_chunks');
  const existing = await collection.listSearchIndexes(VECTOR_INDEX_NAME).toArray();
  if (existing.length > 0) {
    console.log(`Vector index "${VECTOR_INDEX_NAME}" already exists, skipping creation.`);
    return;
  }

  await collection.createSearchIndex({
    name: VECTOR_INDEX_NAME,
    type: 'vectorSearch',
    definition: {
      fields: [{ type: 'vector', path: 'embedding', numDimensions: EMBEDDING_DIMENSIONS, similarity: 'cosine' }],
    },
  });
  console.log(`Created vector index "${VECTOR_INDEX_NAME}" — Atlas needs a minute or two to finish building it before queries work.`);
}

async function main() {
  const uri = getEnv('MONGODB_URI');

  const docs = await loadDocs();
  console.log(`Loaded ${docs.length} knowledge-base docs`);

  const records = buildChunkRecords(docs);
  console.log(`Split into ${records.length} chunks`);

  const chunksWithEmbeddings = await embedChunks(records);
  console.log('Embedded all chunks');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    await storeChunks(client, chunksWithEmbeddings);
    console.log(`Stored ${chunksWithEmbeddings.length} chunks in autocare.kb_chunks`);
    await ensureVectorIndex(client);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Ingestion failed:', err.message);
  process.exit(1);
});
