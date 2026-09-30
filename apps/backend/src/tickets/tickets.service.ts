import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateText, Output } from 'ai';
import { CHAT_MODELS, defaultChatModel, type ChatModels } from '../ai/ai.module';
import { Ticket, TicketDocument } from './schema/ticket.schema';
import { ticketSummarySchema, TicketSummary } from './ticket-summary.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @Inject(CHAT_MODELS) private readonly chatModels: ChatModels,
  ) {}

  findAll() {
    return this.ticketModel.find().lean();
  }

  findById(id: number) {
    return this.ticketModel.findOne({ id }).lean();
  }

  async summarize(id: number): Promise<TicketSummary> {
    const ticket = await this.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    const { output } = await generateText({
      model: defaultChatModel(this.chatModels).instance,
      output: Output.object({ schema: ticketSummarySchema }),
      prompt: `Summarize this support ticket for an agent picking it up cold. Key points should say what matters — urgency, how long it has been open, what the customer is waiting on — not restate every field.\n${JSON.stringify(ticket)}`,
    });

    return output;
  }
}
