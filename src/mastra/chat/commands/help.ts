import { logger } from '../../lib/logger';
import type { CommandHandler } from '../../types';

const COMMANDS: [string, string][] = [
  ['!help', 'Show this list.'],
  [
    '!stop',
    'Immediately stop the current turn and any background work in this thread.',
  ],
  ['!mcps', 'List your connected MCP servers and their status.'],
];

export const help: CommandHandler = async ({ message, thread }) => {
  const text = [
    "*Hey, I'm gorkie.* A helpful assistant right here in Slack. Mention me with anything: questions, code, research, files, or a hand with a task, and I'll pick it up in the thread.",
    '',
    '*Commands*',
    ...COMMANDS.map(([command, description]) => `*${command}:* ${description}`),
    '',
    'Tip: set your custom instructions and manage GitHub, MCP servers, and scheduled tasks from the *Home* tab.',
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
