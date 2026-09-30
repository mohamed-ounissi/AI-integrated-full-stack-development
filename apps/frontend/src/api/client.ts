export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
