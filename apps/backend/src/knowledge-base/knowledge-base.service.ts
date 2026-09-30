import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { embed } from 'ai';
import type { GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { GOOGLE_PROVIDER } from '../ai/ai.module';
import {
  EMBEDDING_DIMENSIONS,
  KbChunk,
  KbChunkDocument,
  VECTOR_INDEX_NAME,
} from './schema/kb-chunk.schema';

export interface KnowledgeBaseMatch {
  sourceDoc: string;
  title: string;
  text: string;
  score: number;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectModel(KbChunk.name) private readonly kbChunkModel: Model<KbChunkDocument>,
    @Inject(GOOGLE_PROVIDER) private readonly google: GoogleGenerativeAIProvider,
  ) {}

  async search(query: string, topK = 3): Promise<KnowledgeBaseMatch[]> {
    const { embedding } = await embed({
      model: this.google.textEmbeddingModel('gemini-embedding-001'),
      value: query,
      providerOptions: {
        google: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: 'RETRIEVAL_QUERY' },
      },
    });

    const results = await this.kbChunkModel.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector: embedding,
          numCandidates: 100,
          limit: topK,
        },
      },
      {
        $project: {
          _id: 0,
          sourceDoc: 1,
          title: 1,
          text: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    return results as KnowledgeBaseMatch[];
  }
}
