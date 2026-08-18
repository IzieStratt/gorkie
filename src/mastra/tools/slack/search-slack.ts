import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { env } from '@/env';
import { chat } from '../../chat/instance';
import { threadState } from '../../chat/state';
import { channelContext } from '../../lib/context';
import { chatChannelId } from '../../lib/ids';
import { input, output } from '../../types/tools/index';
import { assertReadableChannel } from './utils';

const contextMessageSchema = z
  .looseObject({
    text: z.string().optional(),
    ts: z.string().optional(),
    user_id: z.string().optional(),
    channel_id: z.string().optional(),
  })
  .transform((message) => ({
    text: message.text ?? '',
    ts: message.ts,
    userId: message.user_id,
    channelId: message.channel_id
      ? chatChannelId(message.channel_id)
      : undefined,
  }));

const searchResponseSchema = z.looseObject({
  ok: z.boolean(),
  error: z.string().optional(),
  response_metadata: z
    .looseObject({ next_cursor: z.string().optional() })
    .optional(),
  results: z
    .looseObject({
      messages: z
        .array(
          z
            .looseObject({
              author_name: z.string().optional(),
              author_user_id: z.string().optional(),
              channel_id: z.string().optional(),
              channel_name: z.string().optional(),
              content: z.string().optional(),
              context_messages: z
                .looseObject({
                  after: z.array(contextMessageSchema).optional(),
                  before: z.array(contextMessageSchema).optional(),
                })
                .optional(),
              permalink: z.string().optional(),
              team_id: z.string().optional(),
            })
            .transform((message) => ({
              author: message.author_name,
              userId: message.author_user_id,
              channelId: message.channel_id
                ? chatChannelId(message.channel_id)
                : undefined,
              channelName: message.channel_name,
              text: (message.content ?? '').slice(0, 1200),
              before: (message.context_messages?.before ?? []).slice(-3),
              after: (message.context_messages?.after ?? []).slice(0, 3),
              permalink: message.permalink,
            }))
        )
        .optional(),
    })
    .optional(),
});

async function searchSlack({
  token,
  query,
  cursor,
  actionToken,
}: {
  token: string;
  query: string;
  cursor?: string;
  actionToken?: string;
}): Promise<z.infer<typeof searchResponseSchema>> {
  const response = await fetch(
    'https://slack.com/api/assistant.search.context',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        query,
        cursor,
        action_token: actionToken,
        content_types: ['messages'],
        include_context_messages: true,
        limit: 10,
      }),
    }
  );

  const parsed = searchResponseSchema.parse(await response.json());
  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'Slack search failed.');
  }
  return parsed;
}

export async function filterReadableMessages({
  messages,
  currentThreadId,
  assertChannel = assertReadableChannel,
}: {
  messages: NonNullable<
    NonNullable<z.infer<typeof searchResponseSchema>['results']>['messages']
  >;
  currentThreadId?: string;
  assertChannel?: (options: {
    channelId: string;
    currentThreadId?: string;
  }) => Promise<unknown>;
}) {
  const channelIds = new Set<string>();

  for (const message of messages) {
    if (message.channelId) {
      channelIds.add(message.channelId);
    }
    for (const contextMessage of [...message.before, ...message.after]) {
      const channelId = contextMessage.channelId ?? message.channelId;
      if (channelId) {
        channelIds.add(channelId);
      }
    }
  }

  const readableChannelIds = new Set(
    (
      await Promise.all(
        [...channelIds].map((channelId) =>
          assertChannel({ channelId, currentThreadId })
            .then(() => channelId)
            .catch(() => undefined)
        )
      )
    ).filter((channelId) => channelId !== undefined)
  );

  return messages
    .filter(
      (message) =>
        message.channelId && readableChannelIds.has(message.channelId)
    )
    .map((message) => ({
      ...message,
      before: message.before
        .filter((contextMessage) => {
          const channelId = contextMessage.channelId ?? message.channelId;
          return Boolean(channelId && readableChannelIds.has(channelId));
        })
        .map((contextMessage) => contextMessage.text.slice(0, 400)),
      after: message.after
        .filter((contextMessage) => {
          const channelId = contextMessage.channelId ?? message.channelId;
          return Boolean(channelId && readableChannelIds.has(channelId));
        })
        .map((contextMessage) => contextMessage.text.slice(0, 400)),
    }));
}

export const searchSlackTool = createTool({
  id: 'search_slack',
  description:
    'Run one Slack message search for past conversations, decisions, links, people, or internal references. Use Slack search syntax to narrow by keywords, names, channels, senders, or dates. This returns one result page with short surrounding context. Use Slack code mode when the task needs multiple queries, exhaustive pagination, filtering, aggregation, or full conversation reads. Search normally starts from a fresh token on an @mention.',
  inputSchema: input({
    query: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Slack search syntax (e.g. "deploy issue in:#eng", "from:alex budget"). For from:/to:, use the person\'s Slack username, NOT their raw user id (from:U0123ABCD will not match).'
      ),
    cursor: z
      .string()
      .optional()
      .describe('Cursor from a previous result page.'),
  }),
  outputSchema: output({
    messages: z.array(
      z.strictObject({
        author: z.string().optional(),
        userId: z.string().optional(),
        channelId: z.string().optional(),
        channelName: z.string().optional(),
        text: z.string(),
        before: z.array(z.string()),
        after: z.array(z.string()),
        permalink: z.string().optional(),
      })
    ),
    nextCursor: z.string().optional(),
  }),
  transform: {
    display: {
      output: ({ input, output }) => ({
        summary: `Found ${output?.messages.length ?? 0} Slack messages for "${input?.query ?? ''}"`,
      }),
    },
  },
  execute: async ({ query, cursor }, context) => {
    const { threadId } = channelContext(context?.requestContext);
    const thread = threadId ? chat().thread(threadId) : undefined;
    const state = await threadState(thread);
    const token = state?.searchToken;
    const fallbackToken = env.SLACK_SEARCH_USER_TOKEN;
    const canUseBotSearch = Boolean(thread && token);
    const searchToken = canUseBotSearch ? env.SLACK_BOT_TOKEN : fallbackToken;
    if (!searchToken) {
      throw new Error(
        'No Slack search token is available. Ask the user to mention the bot in a new message or set SLACK_SEARCH_USER_TOKEN for search access.'
      );
    }

    let response: z.infer<typeof searchResponseSchema>;
    try {
      response = await searchSlack({
        token: searchToken,
        query,
        cursor,
        actionToken: canUseBotSearch ? token : undefined,
      });
    } catch (error) {
      const reason = String(error);
      if (
        reason.includes('invalid_action_token') ||
        reason.includes('token_expired')
      ) {
        if (fallbackToken) {
          if (thread) {
            await thread.setState({ searchToken: undefined });
          }
          response = await searchSlack({
            token: fallbackToken,
            query,
            cursor,
          });
        } else {
          if (thread) {
            await thread.setState({ searchToken: undefined });
          }
          throw new Error(
            'The Slack search token expired and no user search token is configured. Set SLACK_SEARCH_USER_TOKEN for search access or ask the user to mention the bot in a new message.',
            { cause: error }
          );
        }
      } else {
        throw error;
      }
    }

    const messages = await filterReadableMessages({
      messages: response.results?.messages ?? [],
      currentThreadId: threadId,
    });
    return {
      messages,
      nextCursor: response.response_metadata?.next_cursor || undefined,
    };
  },
});
