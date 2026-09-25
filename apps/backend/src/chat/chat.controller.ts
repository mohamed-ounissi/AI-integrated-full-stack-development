import { Controller, Inject, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from 'ai';
import type { GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { z } from 'zod';
import { GOOGLE_PROVIDER } from '../ai/ai.module';
import { TicketsService } from '../tickets/tickets.service';

@Controller('chat')
export class ChatController {
  constructor(
    @Inject(GOOGLE_PROVIDER) private readonly google: GoogleGenerativeAIProvider,
    private readonly ticketsService: TicketsService,
  ) {}

  @Post()
  async chat(@Body() body: { messages: UIMessage[] }, @Res() res: Response) {
    const result = streamText({
      model: this.google('gemini-3.6-flash'),
      messages: await convertToModelMessages(body.messages),
      stopWhen: stepCountIs(5),
      tools: {
        lookupTicket: tool({
          description:
            'Look up a support ticket by its numeric ID to get its real, current status, customer, and vehicle details. Always use this instead of guessing when asked about a specific ticket.',
          inputSchema: z.object({ id: z.number().describe('The ticket ID number') }),
          execute: async ({ id }) => {
            const ticket = await this.ticketsService.findById(id);
            return ticket ?? { error: `No ticket found with id ${id}` };
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
