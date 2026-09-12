import { logger } from '../../lib/logger';
import { memoryThread } from '../../lib/memory';
import type { CommandHandler } from '../../types';

export async function stopThread(threadId: string): Promise<boolean> {
  const { default: orchestrator } = await import('../../agents/orchestrator');
  const threadMemory = await memoryThread({
    agent: orchestrator,
    externalThreadId: threadId,
  }).catch(() => undefined);
  const scope = threadMemory
    ? { threadId: threadMemory.id, resourceId: threadMemory.resourceId }
    : undefined;
  const activeRunId = scope
    ? orchestrator.getActiveThreadRunId(scope)
    : undefined;
  const manager = orchestrator.getMastraInstance()?.backgroundTaskManager;

  let backgroundTasks: { id: string }[] = [];
  if (scope && manager) {
    try {
      backgroundTasks = (
        await manager.listTasks({
          agentId: orchestrator.id,
          threadId: scope.threadId,
          ...(scope.resourceId ? { resourceId: scope.resourceId } : {}),
          status: ['pending', 'running', 'suspended'],
        })
      ).tasks;
    } catch (error) {
      logger.warn('[commands] Failed to list background tasks for stop', {
        error,
        threadId,
      });
    }
  }

  if (!(scope && (activeRunId || backgroundTasks.length > 0))) {
    return false;
  }
  if (activeRunId) {
    orchestrator.abortThreadStream(scope);
  }
  if (manager) {
    const cancellations = await Promise.allSettled(
      backgroundTasks.map((task) => manager.cancel(task.id))
    );
    if (cancellations.some(({ status }) => status === 'rejected')) {
      logger.warn('[commands] Some background tasks failed to stop', {
        threadId,
      });
    }
  }
  return true;
}

export const stop: CommandHandler = async ({ message, thread }) => {
  if (await stopThread(thread.id)) {
    await thread.post({ markdown: '_Stopped._' });
    return;
  }
  await thread
    .postEphemeral(message.author, 'Nothing to stop right now.', {
      fallbackToDM: false,
    })
    .catch((error: unknown) => {
      logger.warn('[commands] Failed to post stop feedback', {
        error,
        threadId: thread.id,
        userId: message.author.userId,
      });
    });
};
