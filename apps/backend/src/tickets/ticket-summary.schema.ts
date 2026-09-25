import { z } from 'zod';

export const ticketSummarySchema = z.object({
  title: z.string().describe('A short, one-line title for the ticket'),
  keyPoints: z.array(z.string()).describe('The important facts an agent needs at a glance'),
  suggestedAction: z.string().describe('The single next action the agent should take'),
});

export type TicketSummary = z.infer<typeof ticketSummarySchema>;
