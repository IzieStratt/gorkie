import { listMCPServers } from '../../db/queries/mcps';
import { logger } from '../../lib/logger';
import type { CommandHandler } from '../../types';

export const mcps: CommandHandler = async ({ message, thread }) => {
  const { userId } = message.author;
  let text: string;
  try {
    const servers = await listMCPServers(userId);
    text =
      servers.length === 0
        ? 'You have no MCP servers connected. Add one from the gorkie Home tab.'
        : [
            '*Your MCP servers*',
            ...servers.map(
              (server) =>
                `\`${server.name}\` ${server.lastError ? `failed: ${server.lastError}` : 'connected'}`
            ),
            '',
            'Manage them in the gorkie Home tab.',
          ].join('\n');
  } catch (error) {
    logger.warn('[commands] failed to list mcps', { error, userId });
    text = "Couldn't read your MCP servers right now. Try again in a moment.";
  }
  await thread
    .postEphemeral(message.author, text, { fallbackToDM: false })
    .catch((error: unknown) => {
      logger.warn('[commands] failed to post mcps', {
        error,
        threadId: thread.id,
      });
    });
};
