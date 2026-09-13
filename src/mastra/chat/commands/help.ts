import { logger } from '../../lib/logger';
import type { CommandHandler } from '../../types';

const HELP: [string, string][] = [
  ['!help', 'Show this list.'],
  ['!stop', 'Stop the current turn and any background work in this thread.'],
  ['!mcps', 'List your connected MCP servers and their status.'],
];

export const help: CommandHandler = async ({ message, thread }) => {
  const text = [
    '*commands*',
    ...HELP.map(([command, description]) => `\`${command}\` ${description}`),
  ].join('\n');
  await thread
    .postEphemeral(message.author, text, { fallbackToDM: false })
    .catch((error: unknown) => {
      logger.warn('[commands] failed to post help', {
        error,
        threadId: thread.id,
      });
    });
};
