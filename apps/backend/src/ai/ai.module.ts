import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

export const GOOGLE_PROVIDER = 'GOOGLE_PROVIDER';
export const CHAT_MODELS = 'CHAT_MODELS';

const GEMINI_CHAT_MODEL = 'gemini-3.6-flash';

export interface ChatModelOption {
  id: string;
  label: string;
  model: string;
  instance: LanguageModel;
}

export type ChatModels = Map<string, ChatModelOption>;

// Gemini's free tier caps gemini-3.6-flash at 5 requests/min and 20/day (hit during the M4 eval),
// and every tool-using answer costs 2+ requests — so prefer Groq as the default when it's configured.
export function defaultChatModel(models: ChatModels): ChatModelOption {
  return models.get('groq') ?? models.get('gemini')!;
}

function buildChatModels(config: ConfigService): ChatModels {
  const models: ChatModels = new Map();
  const google = createGoogleGenerativeAI({ apiKey: config.getOrThrow<string>('GEMINI_API_KEY') });
  models.set('gemini', { id: 'gemini', label: 'Gemini', model: GEMINI_CHAT_MODEL, instance: google(GEMINI_CHAT_MODEL) });

  const groqKey = config.get<string>('GROQ_API_KEY');
  if (groqKey) {
    const model = 'openai/gpt-oss-120b';
    models.set('groq', { id: 'groq', label: 'Groq', model, instance: createGroq({ apiKey: groqKey })(model) });
  }

  const openRouterKey = config.get<string>('OPENROUTER_API_KEY');
  if (openRouterKey) {
    // gemma-4-31b-it:free 429'd (shared upstream pool) and nemotron-3-super:free 503'd during M4 testing
    const model = 'qwen/qwen3.8-27b:free';
    const openRouter = createOpenAICompatible({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
    });
    models.set('openrouter', { id: 'openrouter', label: 'OpenRouter', model, instance: openRouter(model) });
  }

  return models;
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: GOOGLE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createGoogleGenerativeAI({ apiKey: config.getOrThrow<string>('GEMINI_API_KEY') }),
    },
    {
      provide: CHAT_MODELS,
      inject: [ConfigService],
      useFactory: buildChatModels,
    },
  ],
  exports: [GOOGLE_PROVIDER, CHAT_MODELS],
})
export class AiModule {}
