import {
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
//import { BotCreate } from './dtos/mybots.dto';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class MyBotsService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('KAFKA_SERVICE') private readonly clientKafka: ClientKafka,
  ) {}

  private _toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((v) => this._toCamelCase(v));
    } else if (obj !== null && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, char) =>
          char.toUpperCase(),
        );
        result[camelKey] = this._toCamelCase(obj[key]);
        return result;
      }, {} as any);
    }
    return obj;
  }
  private _pushJobToKafka(botId: any, data: any): any {
    type Datesources = 'text' | 'qa' | 'urls' | 'files';

    const kafkaMessage: {
      botId: any;
      datasources: Record<Datesources, any>;
    } = {
      botId,
      datasources: {
        ...(data.text_input && { text: data.text_input }),
        ...(data.qANDa_input && { qa: data.qANDa_input }),
        ...(data.urls && { urls: data.urls }),
        ...(data.static_files && { files: data.static_files }),
      },
    };

    console.log({ kafkaMessage });
    this.clientKafka.emit('aqkjtrhb-default', JSON.stringify(kafkaMessage));
  }

  async cretaeBots(userId: string) {
    const persianBotNames = [
      'هوشمند',
      'یارا',
      'پشتیبان',
      'پردازشگر',
      'نیک‌یار',
      'آوا',
      'ماهور',
      'آریا',
      'راهنما',
      'ساینا',
      'مهسا',
      'نوید',
      'نگهبان',
      'کاوشگر',
      'تیرا',
      'رویا',
      'کیان',
      'شبنم',
      'رایان',
      'پیشرو',
    ];

    function getRandomPersianBotName(names: string[]): string {
      const randomIndex = Math.floor(Math.random() * names.length);
      return names[randomIndex];
    }

    try {
      const randomBotName = getRandomPersianBotName(persianBotNames);
      const createdBot = await this.prismaService.bots.create({
        data: {
          user_id: userId,
          name: randomBotName,
        },
      });
      return createdBot;
    } catch (error) {
      console.log(error);
    }
  }

  async createConversation({
    botId,
    widgetVersion,
    sessionId,
    userIP,
    userLocation,
  }: {
    botId: string;
    widgetVersion: string;
    sessionId: string;
    userIP: string;
    userLocation?: string;
  }): Promise<{ sessionId: string; conversationId: string }> {
    let conversation;
    try {
      conversation = await this.prismaService.conversations.create({
        data: {
          bot_id: botId,
          widget_version: widgetVersion,
          session_id: sessionId,
          user_ip: userIP,
          user_location: userLocation,
          metadata: {}, // Empty object for now
        },
      });
    } catch (error) {
      console.log('Error creating conversation row:', error);
    }

    return {
      sessionId: conversation.session_id,
      conversationId: conversation.conversation_id,
    };
  }

  async createDataSource(data: any) {
    console.log({ data });

    try {
      const createdDataSource = await this.prismaService.datasources.create({
        data,
      });

      this._pushJobToKafka(data.bot_id, data);

      return createdDataSource;
    } catch (error) {
      console.log(error);
    }
  }

  async getAllBots(
    pageNumber: number,
    itemsPerPage: number,
    type: string,
    user_id: string,
  ) {
    const totalCount = await this.prismaService.bots.count({
      where: {
        user_id,
        type,
      },
    });

    const bots = await this.prismaService.bots.findMany({
      where: {
        user_id,
        type,
      },
      take: +itemsPerPage,
      skip: (pageNumber - 1) * itemsPerPage,
    });

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return {
      bots,
      totalPages,
      itemsPerPage,
      totalItems: totalCount,
    };
  }
  async getConversations(botId: string, conversationId?: string) {
    let conversations;

    if (conversationId) {
      // Fetch a specific conversation by conversation_id and bot_id
      conversations = await this.prismaService.conversations.findFirst({
        where: {
          conversation_id: conversationId,
          bot_id: botId,
        },
        include: {
          records: true, // Optionally include records if you want to fetch messages as well
        },
      });
    } else {
      // Fetch all conversations for a bot
      conversations = await this.prismaService.conversations.findMany({
        where: {
          bot_id: botId,
        },
        include: {
          records: true, // Optionally include records if you want to fetch messages as well
        },
      });
    }

    if (
      !conversations ||
      (Array.isArray(conversations) && conversations.length === 0)
    ) {
      if (conversationId) {
        throw new NotFoundException(
          `Conversation with ID ${conversationId} not found`,
        );
      } else {
        throw new NotFoundException(
          `No conversations found for bot with ID ${botId}`,
        );
      }
    }

    return this._toCamelCase(conversations);
  }

  async deleteBot(botId: string, userId: string): Promise<boolean> {
    try {
      const bot = await this.prismaService.bots.findFirst({
        where: { bot_id: botId, user_id: userId },
      });
      if (!bot) {
        return false;
      }

      await this.prismaService.bots.delete({
        where: { bot_id: botId },
      });

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async findeBot(botId: string, userId: string): Promise<any> {
    try {
      const bot = await this.prismaService.bots.findFirst({
        where: { bot_id: botId, user_id: userId },
      });
      if (!bot) {
        throw new HttpException('Bot not found', 404);
      }
      return bot;
    } catch (error) {
      console.error('Error finding bot:', error);
      throw new HttpException('Internal Server Error', 500);
    }
  }
}
