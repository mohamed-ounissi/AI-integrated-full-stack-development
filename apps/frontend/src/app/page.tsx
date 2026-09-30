'use client';

import { useState } from 'react';
import { CarFront, ListChecks, MessagesSquare } from 'lucide-react';
import { ChatPanel } from '@/features/chat/chat-panel';
import { ProviderSelect } from '@/features/chat/provider-select';
import { useCopilotChat } from '@/features/chat/use-copilot-chat';
import { TicketsPanel } from '@/features/tickets/tickets-panel';

export default function Home() {
  const chat = useCopilotChat();
  const [showTickets, setShowTickets] = useState(false);

  const askFromTicket = (text: string) => {
    chat.ask(text);
    setShowTickets(false);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <CarFront className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold leading-tight">AutoCare Copilot</h1>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">AI assistant for support agents</p>
        </div>
        <ProviderSelect chat={chat} />
        <button
          onClick={() => setShowTickets((v) => !v)}
          title={showTickets ? 'Show chat' : 'Show tickets'}
          className="flex size-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 lg:hidden dark:border-zinc-800 dark:text-zinc-300"
        >
          {showTickets ? <MessagesSquare className="size-4" /> : <ListChecks className="size-4" />}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${showTickets ? 'flex' : 'hidden'} w-full shrink-0 border-r border-zinc-200 bg-zinc-100/60 lg:flex lg:w-80 dark:border-zinc-800 dark:bg-zinc-900/40`}
        >
          <TicketsPanel onAsk={askFromTicket} />
        </aside>
        <main className={`${showTickets ? 'hidden' : 'flex'} min-w-0 flex-1 lg:flex`}>
          <ChatPanel chat={chat} />
        </main>
      </div>
    </div>
  );
}
