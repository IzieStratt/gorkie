import { listMCPServers } from '../../db/queries/mcps';
import { githubAccess } from '../../lib/github';
import { logger } from '../../lib/logger';
import type { CommandHandler } from '../../types';

export const mcps: CommandHandler = async ({ message, thread }) => {
  const { userId } = message.author;
  const lines = [
    '*MCP servers and connections*',
    '',
    '*Built in:* `context7` live library docs.',
  ];

  try {
    const servers = await listMCPServers(userId);
    lines.push(
      '',
      servers.length === 0
        ? '*Yours:* none yet. Add one from the *Home* tab.'
        : [
            '*Yours:*',
            ...servers.map(
              (server) =>
                `\`${server.name}\` ${server.lastError ? `failed: ${server.lastError}` : 'connected'}`
            ),
          ].join('\n')
    );
  } catch (error) {
    logger.warn('[commands] failed to list mcps', { error, userId });
    lines.push('', "*Yours:* couldn't read them right now, try again shortly.");
  }

  try {
    const github = await githubAccess({ isDM: thread.isDM, userId });
    lines.push(
      '',
      github.state === 'connected'
        ? `*GitHub:* connected (${github.credential.kind}). Native integration, not an MCP server.`
        : '*GitHub:* not connected. Connect it from the *Home* tab.'
    );
  } catch (error) {
    logger.warn('[commands] failed to read github status', { error, userId });
  }

  await thread
    .postEphemeral(message.author, lines.join('\n'), { fallbackToDM: false })
    .catch((error: unknown) => {
      logger.warn('[commands] failed to post mcps', {
        error,
        threadId: thread.id,
      });
    });
};
