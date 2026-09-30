'use client';

import { useEffect, useState } from 'react';
import { CircleAlert, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { fetchTickets, summarizeTicket, type Ticket, type TicketStatus, type TicketSummary } from '@/api/tickets';

const STATUS_STYLES: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  in_progress: { label: 'In progress', className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  resolved: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>;
}

type SummaryState = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'done'; data: TicketSummary };

function TicketDetail({ ticket, onAsk }: { ticket: Ticket; onAsk: (text: string) => void }) {
  const [summary, setSummary] = useState<SummaryState>({ status: 'idle' });

  const summarize = () => {
    setSummary({ status: 'loading' });
    summarizeTicket(ticket.id)
      .then((data) => setSummary({ status: 'done', data }))
      .catch(() => setSummary({ status: 'error' }));
  };

  return (
    <div className="space-y-4 border-t border-zinc-200 p-4 dark:border-zinc-800">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-zinc-500">Customer</dt>
          <dd className="font-medium">{ticket.customerName}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Assigned to</dt>
          <dd className="font-medium">{ticket.assignedTo}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Vehicle VIN</dt>
          <dd className="font-mono">{ticket.vehicleVin}</dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <button
          onClick={summarize}
          disabled={summary.status === 'loading'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {summary.status === 'loading' ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Summarize
        </button>
        <button
          onClick={() =>
            onAsk(`Brief me on ticket ${ticket.id}, then check the knowledge base for what I should look at first for its issue.`)
          }
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <MessageSquare className="size-3.5" />
          Ask Copilot
        </button>
      </div>

      {summary.status === 'error' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <CircleAlert className="size-3.5" /> Couldn&apos;t generate a summary — try again in a moment.
        </p>
      )}

      {summary.status === 'done' && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-300">
            <Sparkles className="size-3.5" /> Structured summary
          </div>
          <p className="text-sm font-semibold">{summary.data.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-zinc-700 dark:text-zinc-300">
            {summary.data.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-white px-2.5 py-2 dark:bg-zinc-900">
            <span className="font-medium">Next action: </span>
            {summary.data.suggestedAction}
          </p>
        </div>
      )}
    </div>
  );
}

export function TicketsPanel({ onAsk }: { onAsk: (text: string) => void }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    fetchTickets()
      .then((data) => setTickets(data.sort((a, b) => a.id - b.id)))
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-baseline justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold">Tickets</h2>
        {tickets && <span className="text-xs text-zinc-500">{tickets.length} total</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {failed && <p className="px-2 text-xs text-red-600 dark:text-red-400">Couldn&apos;t reach the backend.</p>}
        {!tickets && !failed && (
          <div className="flex items-center gap-2 px-2 text-xs text-zinc-500">
            <Loader2 className="size-3.5 animate-spin" /> Loading tickets…
          </div>
        )}
        <ul className="space-y-1">
          {tickets?.map((ticket) => {
            const selected = ticket.id === selectedId;
            return (
              <li
                key={ticket.id}
                className={`overflow-hidden rounded-xl border transition ${
                  selected
                    ? 'border-indigo-300 bg-white shadow-sm dark:border-indigo-500/40 dark:bg-zinc-900'
                    : 'border-transparent hover:bg-white dark:hover:bg-zinc-900'
                }`}
              >
                <button
                  onClick={() => setSelectedId(selected ? null : ticket.id)}
                  className="w-full px-3 py-2.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-zinc-500">#{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{ticket.issue}</p>
                  <p className="text-xs text-zinc-500">
                    {ticket.customerName} · {ticket.createdAt}
                  </p>
                </button>
                {selected && <TicketDetail ticket={ticket} onAsk={onAsk} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
