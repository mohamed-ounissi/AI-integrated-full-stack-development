'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, BookOpen, CircleAlert, ClipboardList, Gauge, MessageSquarePlus, Square, Wrench } from 'lucide-react';
import { ChatMessage } from './chat-message';
import type { CopilotChat } from './use-copilot-chat';

const SUGGESTIONS = [
  { icon: Gauge, label: 'Diagnostics', text: 'What does diagnostic code P0420 mean?' },
  { icon: BookOpen, label: 'Policy', text: "What's our policy for towing after business hours?" },
  { icon: ClipboardList, label: 'Tickets', text: "What's the status of ticket 4 and who has it?" },
  { icon: Wrench, label: 'Troubleshooting', text: 'Customer says the AC is blowing warm air — what should I ask?' },
];

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col justify-center px-4 py-10">
      <h2 className="text-2xl font-semibold tracking-tight">How can I help with this call?</h2>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Ask about a ticket, a diagnostic code, or a service policy. Answers come from real ticket data and the AutoCare
        knowledge base, with sources shown.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
          <button
            key={label}
            onClick={() => onPick(text)}
            className="group rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500/50"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <Icon className="size-4 text-indigo-500" />
              {label}
            </div>
            <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">{text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({ chat }: { chat: CopilotChat }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const submit = (text: string) => {
    chat.ask(text);
    setInput('');
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {chat.messages.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {chat.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {chat.status === 'submitted' && (
              <div className="flex items-center gap-2 pl-11 text-sm text-zinc-500">
                <span className="size-1.5 animate-pulse rounded-full bg-indigo-500" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {chat.error && (
        <div className="mx-auto mb-2 flex w-full max-w-3xl items-start gap-2 px-4">
          <div className="flex flex-1 items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">
              The model provider returned an error — often a free-tier rate limit. Try again, or switch model in the header.
            </span>
            <button onClick={() => chat.clearError()} className="font-medium underline-offset-2 hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <form
          className="mx-auto flex max-w-3xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <button
            type="button"
            title="New conversation"
            onClick={() => chat.setMessages([])}
            disabled={chat.busy || chat.messages.length === 0}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
          >
            <MessageSquarePlus className="size-5" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a ticket, a code, or a policy…"
            className="h-10 flex-1 rounded-full border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {chat.busy ? (
            <button
              type="button"
              title="Stop"
              onClick={() => chat.stop()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              title="Send"
              disabled={!input.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <ArrowUp className="size-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
