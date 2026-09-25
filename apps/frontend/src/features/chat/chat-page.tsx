'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  return (
    <div className="flex h-screen flex-col items-center bg-zinc-50 px-4 py-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'self-end rounded-2xl bg-blue-600 px-4 py-2 text-white'
                : 'self-start rounded-2xl bg-zinc-200 px-4 py-2 text-black dark:bg-zinc-800 dark:text-white'
            }
          >
            {message.parts.map((part, i) =>
              part.type === 'text' ? <span key={`${message.id}-${i}`}>{part.text}</span> : null,
            )}
          </div>
        ))}
        {status === 'submitted' && <div className="self-start text-sm text-zinc-500">Thinking…</div>}
      </div>

      <form
        className="mt-4 flex w-full max-w-2xl gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="flex-1 rounded-full border border-zinc-300 px-4 py-2 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          value={input}
          placeholder="Ask AutoCare Copilot something…"
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-full bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={status !== 'ready'}
        >
          Send
        </button>
      </form>
    </div>
  );
}
