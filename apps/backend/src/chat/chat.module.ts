import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TicketsModule } from '../tickets/tickets.module';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [AiModule, TicketsModule, KnowledgeBaseModule],
  controllers: [ChatController],
})
export class ChatModule {}
