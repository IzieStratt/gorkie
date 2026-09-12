import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '@/env';
import { db } from './client';

export { db, postgresStore } from './client';

export async function createTables(): Promise<void> {
  await migrate(db, {
    migrationsFolder: join(env.PROJECT_ROOT, 'drizzle'),
  });
}
