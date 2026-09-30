'use client';

import { ChevronDown, Cpu } from 'lucide-react';
import type { CopilotChat } from './use-copilot-chat';

export function ProviderSelect({ chat }: { chat: CopilotChat }) {
  if (chat.providers.length === 0) return null;
  const current = chat.providers.find((p) => p.id === chat.provider);

  return (
    <label className="relative flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Cpu className="size-4 text-indigo-500" />
      <span className="font-medium">{current?.label ?? 'Model'}</span>
      <span className="hidden font-mono text-xs text-zinc-500 sm:inline">{current?.model}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-zinc-400" />
      <select
        aria-label="Model provider"
        value={chat.provider ?? ''}
        onChange={(e) => chat.setProvider(e.target.value)}
        disabled={chat.busy}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {chat.providers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label} — {p.model}
          </option>
        ))}
      </select>
    </label>
  );
}
