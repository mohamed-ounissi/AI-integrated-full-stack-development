import { request } from './client';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface Ticket {
  id: number;
  customerName: string;
  vehicleVin: string;
  issue: string;
  status: TicketStatus;
  assignedTo: string;
  createdAt: string;
}

export interface TicketSummary {
  title: string;
  keyPoints: string[];
  suggestedAction: string;
}

export function fetchTickets() {
  return request<Ticket[]>('/tickets');
}

export function summarizeTicket(id: number) {
  return request<TicketSummary>(`/tickets/${id}/summary`, { method: 'POST' });
}
