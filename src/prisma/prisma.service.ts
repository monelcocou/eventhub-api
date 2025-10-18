import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    // Logs des requêtes SQL (utile en dev)
    this.$on('query' as any, (e: any) => {
      this.logger.debug(`Query: ${e.query}`);
      this.logger.debug(`Duration: ${e.duration}ms`);
    });

    this.$on('error' as any, (e: any) => {
      this.logger.error(`Error: ${e.message}`);
    });

    await this.$connect();
    this.logger.log('✅ Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('❌ Disconnected from database');
  }

  // Méthode utilitaire pour nettoyer la BDD en dev/test
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production!');
    }

    // Ordre important à cause des relations
    await this.$transaction([
      this.refreshToken.deleteMany(),
      this.registration.deleteMany(),
      this.event.deleteMany(),
      this.category.deleteMany(),
      this.user.deleteMany(),
    ]);

    this.logger.log('🧹 Database cleaned');
  }
}
