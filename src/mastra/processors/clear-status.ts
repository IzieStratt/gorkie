import type { ProcessOutputResultArgs } from '@mastra/core/processors';
import { slack } from '../chat/client';
import { channelContext } from '../lib/context';
import { logger } from '../lib/logger';

export const clearStatus = {
  id: 'clear-status',
  name: 'Clear Status',
  description:
    'Clears Slack\'s assistant status indicator once a turn ends. Slack only auto-clears it on a posted message, not when streaming stops, so a turn that ends without posting (e.g. right after the wait tool) would otherwise leave a stale status like "is waiting…" stuck on the thread.',
  async processOutputResult(args: ProcessOutputResultArgs) {
    const { requestContext, messages } = args;
    const { threadId } = channelContext(requestContext);
    if (threadId) {
      try {
        const { channel, threadTs } = slack.decodeThreadId(threadId);
        await slack.setAssistantStatus(channel, threadTs, '');
      } catch (error) {
        logger.debug('[status] failed to clear', { error });
      }
    }
    return messages;
  },
};
