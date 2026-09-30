import { DefaultChatTransport } from 'ai';
import { BACKEND_URL, request } from './client';

export interface ChatProvider {
  id: string;
  label: string;
  model: string;
  isDefault: boolean;
}

export function createChatTransport() {
  return new DefaultChatTransport({ api: `${BACKEND_URL}/chat` });
}

export function fetchProviders() {
  return request<ChatProvider[]>('/chat/providers');
}
