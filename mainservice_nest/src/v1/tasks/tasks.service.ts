import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('0 0 * * *')
  subscriptionCheckCron() {
    //this.logger.debug('Everyday subscription check cron executed!');
  }

  onModuleInit() {
    this.subscriptionCheckCron();
    //this.logger.debug('Called at server startup');
  }
}
