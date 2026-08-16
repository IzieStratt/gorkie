import { createTool } from '@mastra/core/tools';
import { computeNextFireAt, validateCron } from '@mastra/core/workflows';
import { z } from 'zod';
import { agent as agentConfig, scheduledTasks } from '../../config';
import { taskContext } from '../../lib/memory';
import { input, output } from '../../types/tools/index';

function assertMinimumInterval(cron: string, timezone?: string): void {
  validateCron(cron, timezone);
  let previous = computeNextFireAt(cron, { timezone });
  for (let i = 1; i < 5; i += 1) {
    let fire: number;
    try {
      fire = computeNextFireAt(cron, { timezone, after: previous });
    } catch {
      break;
    }
    const gap = fire - previous;
    if (gap < scheduledTasks.minInterval) {
      throw new Error(
        `That schedule fires every ${Math.round(gap / 60_000)} minutes. Minimum interval is ${scheduledTasks.minInterval / 60_000} minutes.`
      );
    }
    previous = fire;
  }
}

export const createScheduledTaskTool = createTool({
  id: 'create_scheduled_task',
  description:
    'Create a recurring schedule for the current Slack conversation. Use a valid cron expression and optional IANA timezone. Minimum interval is 30 minutes between fires, each run costs model credits: never request a faster cadence, refuse and offer the nearest 30-minute-or-slower option instead.',
  inputSchema: input({
    task: z.string().min(1).describe('Prompt to run on the schedule.'),
    cron: z
      .string()
      .min(1)
      .describe(
        'Cron expression for when to run. Minimum interval: 30 minutes between fires.'
      ),
    name: z
      .string()
      .min(1)
      .max(120)
      .optional()
      .describe('Short human-readable name for the schedule.'),
    timezone: z
      .string()
      .min(1)
      .optional()
      .describe('IANA timezone, such as America/New_York.'),
  }),
  outputSchema: output({ schedule: z.unknown() }),
  execute: async ({ task, cron, name, timezone }, context) => {
    const service = context.mastra?.schedules;
    const { threadId, resourceId } = await taskContext({
      context,
      agentId: agentConfig.id,
      missing: 'No current Slack thread/resource to schedule into.',
    });
    if (!service) {
      throw new Error('No Mastra schedule service is available.');
    }

    assertMinimumInterval(cron, timezone);

    return {
      schedule: await service.create({
        agentId: agentConfig.id,
        cron,
        prompt: task,
        threadId,
        resourceId,
        ...(name ? { name } : {}),
        ...(timezone ? { timezone } : {}),
      }),
    };
  },
});
