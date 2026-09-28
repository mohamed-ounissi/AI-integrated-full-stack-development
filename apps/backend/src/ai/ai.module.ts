import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const GOOGLE_PROVIDER = 'GOOGLE_PROVIDER';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: GOOGLE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createGoogleGenerativeAI({
          apiKey: config.getOrThrow<string>('GEMINI_API_KEY'),
        }),
    },
  ],
  exports: [GOOGLE_PROVIDER],
})
export class AiModule {}
