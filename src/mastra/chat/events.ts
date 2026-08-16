import { logger } from '../lib/logger';
import { slack } from './client';
import { content } from './content';
import { chat } from './instance';
import { acceptOptIn } from './onboarding';

async function setStarters({
  channelId,
  threadTs,
}: {
  channelId: string;
  threadTs: string;
}): Promise<void> {
  await slack
    .setSuggestedPrompts(channelId, threadTs, content.starters)
    .catch((error: unknown) =>
      logger.error('[events] setSuggestedPrompts failed', { error })
    );
}

export function registerEvents(): void {
  const bot = chat();

  bot.onAssistantThreadStarted((event) =>
    setStarters({ channelId: event.channelId, threadTs: event.threadTs })
  );

  bot.onAssistantContextChanged((event) =>
    setStarters({ channelId: event.channelId, threadTs: event.threadTs })
  );

  bot.onAppHomeOpened((event) =>
    slack
      .publishHomeView(event.userId, content.home)
      .catch((error: unknown) =>
        logger.error('[events] publishHomeView failed', { error })
      )
  );

  bot.onAction('opt_in_accept', acceptOptIn);
}
