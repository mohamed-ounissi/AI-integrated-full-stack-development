import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [AiModule, TicketsModule],
  controllers: [ChatController],
})
export class ChatModule {}
