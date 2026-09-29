import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KbChunkDocument = HydratedDocument<KbChunk>;

export const EMBEDDING_DIMENSIONS = 768;
export const VECTOR_INDEX_NAME = 'kb_vector_index';

@Schema({ collection: 'kb_chunks' })
export class KbChunk {
  @Prop({ required: true })
  sourceDoc: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true, type: [Number] })
  embedding: number[];
}

export const KbChunkSchema = SchemaFactory.createForClass(KbChunk);
