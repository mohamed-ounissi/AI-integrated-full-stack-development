import { BadRequestException, Body, Controller, Get, Inject, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai';
import { z } from 'zod';
import { CHAT_MODELS, defaultChatModel, type ChatModels } from '../ai/ai.module';
import { TicketsService } from '../tickets/tickets.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

const SYSTEM_PROMPT = `You are AutoCare Copilot, an assistant for AutoCare's support agents (not end customers).
- For questions about a specific ticket, call lookupTicket. Never guess ticket details.
- For diagnostic codes, service policies, or how-to questions, call searchKnowledgeBase and answer only from what it returns. Cite the source doc filename.
- One question can need both: e.g. "brief me on ticket 4 and what to check" means look up the ticket, then search the knowledge base for its issue.
- If a tool returns nothing relevant, say so plainly instead of inventing an answer.
- Keep answers short and practical: an agent is reading this mid-call. Use short markdown bullets — no tables, no HTML tags.`;

@Controller('chat')
export class ChatController {
  constructor(
    @Inject(CHAT_MODELS) private readonly chatModels: ChatModels,
    private readonly ticketsService: TicketsService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
  ) {}

  @Get('providers')
  providers() {
    const defaultId = defaultChatModel(this.chatModels).id;
    return [...this.chatModels.values()].map(({ id, label, model }) => ({ id, label, model, isDefault: id === defaultId }));
  }

  @Post()
  async chat(@Body() body: { messages: UIMessage[]; provider?: string }, @Res() res: Response) {
    const option = body.provider ? this.chatModels.get(body.provider) : defaultChatModel(this.chatModels);
    if (!option) {
      throw new BadRequestException(`Unknown or unconfigured provider "${body.provider}"`);
    }

    const result = streamText({
      model: option.instance,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(body.messages),
      stopWhen: stepCountIs(5),
      tools: {
        lookupTicket: tool({
          description:
            'Look up a support ticket by its numeric ID to get its real, current status, customer, and vehicle details.',
          inputSchema: z.object({ id: z.number().describe('The ticket ID number') }),
          execute: async ({ id }) => {
            const ticket = await this.ticketsService.findById(id);
            return ticket ?? { error: `No ticket found with id ${id}` };
          },
        }),
        searchKnowledgeBase: tool({
          description:
            'Search the AutoCare knowledge base (diagnostic-code explanations, service policies, FAQs) for grounded answers.',
          inputSchema: z.object({ query: z.string().describe('What to search for, in plain language') }),
          execute: async ({ query }) => {
            const matches = await this.knowledgeBaseService.search(query);
            return matches.length > 0 ? matches : { error: 'No relevant knowledge-base entries found' };
          },
        }),
      },
    });

    const webResponse = result.toUIMessageStreamResponse();
    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));

    if (webResponse.body) {
      Readable.fromWeb(webResponse.body as never).pipe(res);
    } else {
      res.end();
    }
  }
}
