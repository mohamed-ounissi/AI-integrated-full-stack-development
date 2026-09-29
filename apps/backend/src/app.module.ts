import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { TicketsModule } from './tickets/tickets.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: 'autocare',
      }),
    }),
    ChatModule,
    TicketsModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
