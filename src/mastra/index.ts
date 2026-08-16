import { Mastra } from '@mastra/core/mastra';
import { MastraCompositeStore } from '@mastra/core/storage';
import { DuckDBStore } from '@mastra/duckdb';
import {
  MastraPlatformExporter,
  MastraStorageExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { PostgresStore } from '@mastra/pg';
import { env } from '@/env';
import { exploreAgent as explore } from './agents/explore';
import orchestrator from './agents/orchestrator';
import { researchAgent as research } from './agents/research';
import { summarizer } from './agents/summarizer';
import { registerEvents } from './chat/events';
import { setChat } from './chat/instance';
import { buildAllowlist } from './lib/allowed-users';
import { logger } from './lib/logger';

process.on('unhandledRejection', (err: unknown) => {
  logger.error('[process] unhandled rejection', { err });
});
process.on('uncaughtException', (err: Error) => {
  logger.error('[process] uncaught exception', { err });
});

export const mastra = new Mastra({
  agents: { orchestrator, summarizer, research, explore },
  backgroundTasks: {
    enabled: true,
    globalConcurrency: 6,
    perAgentConcurrency: 4,
    backpressure: 'queue',
    defaultTimeoutMs: 900_000,
  },
  schedules: {
    prepare: async ({ mastra: runtime, schedule }) => {
      const current = await runtime.schedules.get(schedule.id);
      if (current?.metadata?.kind === 'wait') {
        await runtime.schedules.delete(schedule.id);
      }
    },
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new PostgresStore({
      id: 'main-storage',
      connectionString: env.DATABASE_URL,
    }),
    domains: {
      observability: await new DuckDBStore({
        path: './observability.duckdb',
      }).getStore('observability'),
    },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'orchestrator',
        exporters: [
          new MastraStorageExporter(),
          new MastraPlatformExporter({
            accessToken: env.MASTRA_PLATFORM_ACCESS_TOKEN,
            projectId: env.MASTRA_PROJECT_ID,
          }),
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  logger,
});

await mastra.startWorkers();

orchestrator
  .getChannels()
  ?.initialize(mastra)
  .then(async () => {
    const sdk = orchestrator.getChannels()?.sdk;
    if (!sdk) {
      return;
    }
    setChat(sdk);
    registerEvents();
    await buildAllowlist();
    logger.info('[agent] online');
  })
  .catch((err: unknown) =>
    logger.error('[agent] initialization failed', { err })
  );
