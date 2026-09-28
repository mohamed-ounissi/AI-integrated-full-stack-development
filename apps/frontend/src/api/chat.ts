import { DefaultChatTransport } from 'ai';
import { BACKEND_URL } from './client';

export function createChatTransport() {
  return new DefaultChatTransport({ api: `${BACKEND_URL}/chat` });
}
