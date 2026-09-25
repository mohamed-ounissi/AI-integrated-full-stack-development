import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateObject } from 'ai';
import type { GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { GOOGLE_PROVIDER } from '../ai/ai.module';
import { Ticket, TicketDocument } from './schema/ticket.schema';
import { ticketSummarySchema, TicketSummary } from './ticket-summary.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @Inject(GOOGLE_PROVIDER) private readonly google: GoogleGenerativeAIProvider,
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

    const { object } = await generateObject({
      model: this.google('gemini-3.6-flash'),
      schema: ticketSummarySchema,
      prompt: `Summarize this support ticket for an agent who has not seen it yet:\n${JSON.stringify(ticket)}`,
    });

    return object;
  }
}
