import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { KbChunk, KbChunkSchema } from './schema/kb-chunk.schema';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: KbChunk.name, schema: KbChunkSchema }]), AiModule],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
