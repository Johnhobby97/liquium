/**
 * Prisma database client singleton
 */
import { PrismaClient } from '@prisma/client';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('prisma');

// Prisma Client singleton
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query' as never, (e: any) => {
        logger.debug('Query', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    // Log errors
    prisma.$on('error' as never, (e: any) => {
      logger.error('Prisma error', e);
    });

    // Log warnings
    prisma.$on('warn' as never, (e: any) => {
      logger.warn('Prisma warning', e);
    });

    logger.info('Prisma client initialized');
  }

  return prisma;
}

// Graceful shutdown
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected');
    prisma = null;
  }
}

// Health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection failed', error);
    return false;
  }
}

export default getPrismaClient();
