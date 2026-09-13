import type { AnySpan, SpanOutputProcessor } from '@mastra/core/observability';
import { SpanType } from '@mastra/core/observability';
import { z } from 'zod';

// Mastra Core stashes the live Slack adapter, which holds SLACK_BOT_TOKEN and
// SLACK_APP_TOKEN, in requestContext under this key. SensitiveDataFilter never
// touches requestContext, so without stripping it the tokens export verbatim on
// every span. Value from `@mastra/core` CHAT_CHANNEL_RENDER_CONTEXT_KEY.
const RENDER_KEY = '__mastra_chat_channel_render';

const channel = z.object({
  channelId: z.string().optional(),
  eventType: z.string().optional(),
  isDM: z.boolean().optional(),
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
});

export const slackIdentity: SpanOutputProcessor = {
  name: 'slack-identity',
  process(span?: AnySpan): AnySpan | undefined {
    if (!span) {
      return span;
    }

    const context = span.requestContext;
    if (context && typeof context === 'object' && RENDER_KEY in context) {
      // Export a copy without the adapter rather than mutating the live
      // context, which a running turn still needs to render under realtime
      // export. Keeps requestContext.channel for the identity below.
      const sanitized = { ...context };
      Reflect.deleteProperty(sanitized, RENDER_KEY);
      span.requestContext = sanitized;
    }

    if (span.type !== SpanType.AGENT_RUN || span.getParentSpanId()) {
      return span;
    }
    const parsed = channel.safeParse(span.requestContext?.channel);
    if (!parsed.success) {
      return span;
    }
    const slack = parsed.data;
    span.metadata = {
      ...span.metadata,
      channelId: slack.channelId,
      eventType: slack.eventType,
      isDM: slack.isDM,
      messageId: slack.messageId,
      sessionId: slack.threadId,
      userId: slack.userId,
      userName: slack.userName,
    };
    return span;
  },
  shutdown() {
    return Promise.resolve();
  },
};
