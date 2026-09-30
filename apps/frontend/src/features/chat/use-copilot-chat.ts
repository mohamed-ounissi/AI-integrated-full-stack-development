'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { createChatTransport, fetchProviders, type ChatProvider } from '@/api/chat';

export function useCopilotChat() {
  const transport = useMemo(() => createChatTransport(), []);
  const chat = useChat({ transport });
  const [providers, setProviders] = useState<ChatProvider[]>([]);
  const [provider, setProvider] = useState<string | undefined>();

  useEffect(() => {
    fetchProviders()
      .then((list) => {
        setProviders(list);
        setProvider(list.find((p) => p.isDefault)?.id);
      })
      .catch(() => setProviders([]));
  }, []);

  const busy = chat.status === 'submitted' || chat.status === 'streaming';

  const ask = (text: string) => {
    if (!text.trim() || busy) return;
    chat.sendMessage({ text }, { body: { provider } });
  };

  return { ...chat, busy, ask, providers, provider, setProvider };
}

export type CopilotChat = ReturnType<typeof useCopilotChat>;
