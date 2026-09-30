import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UIMessage } from 'ai';
import { Bot, FileText, Loader2, Search, TicketCheck } from 'lucide-react';

type ToolPart = { state: string; input?: unknown; output?: unknown };

function ToolChip({ icon, children, pending }: { icon: React.ReactNode; children: React.ReactNode; pending: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
    </div>
  );
}

function TicketLookup({ part }: { part: ToolPart }) {
  const id = (part.input as { id?: number } | undefined)?.id;
  const pending = part.state !== 'output-available';
  const notFound = !pending && typeof part.output === 'object' && part.output !== null && 'error' in part.output;
  return (
    <ToolChip icon={<TicketCheck className="size-3.5 text-indigo-500" />} pending={pending}>
      {pending ? `Looking up ticket #${id ?? '…'}` : notFound ? `Ticket #${id} not found` : `Looked up ticket #${id}`}
    </ToolChip>
  );
}

function KnowledgeSearch({ part }: { part: ToolPart }) {
  const query = (part.input as { query?: string } | undefined)?.query;
  const pending = part.state !== 'output-available';
  const sources = Array.isArray(part.output)
    ? [...new Set((part.output as { sourceDoc: string }[]).map((m) => m.sourceDoc))]
    : [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolChip icon={<Search className="size-3.5 text-indigo-500" />} pending={pending}>
        {pending ? 'Searching knowledge base' : 'Searched knowledge base'}
        {query && <span className="text-zinc-400">· “{query}”</span>}
      </ToolChip>
      {sources.map((source) => (
        <span
          key={source}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          <FileText className="size-3" />
          {source}
        </span>
      ))}
    </div>
  );
}

export function ChatMessage({ message }: { message: UIMessage }) {
  if (message.role === 'user') {
    const text = message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white shadow-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Bot className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        {message.parts.map((part, i) => {
          const key = `${message.id}-${i}`;
          if (part.type === 'text') {
            return (
              <div key={key} className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-zinc-800">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              </div>
            );
          }
          if (part.type === 'tool-lookupTicket') return <TicketLookup key={key} part={part as ToolPart} />;
          if (part.type === 'tool-searchKnowledgeBase') return <KnowledgeSearch key={key} part={part as ToolPart} />;
          return null;
        })}
      </div>
    </div>
  );
}
