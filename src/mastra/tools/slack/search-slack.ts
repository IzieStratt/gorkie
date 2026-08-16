import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { slack } from '../../chat/client';
import { chat } from '../../chat/instance';
import { threadState } from '../../chat/state';
import { channelContext } from '../../lib/context';
import { chatChannelId } from '../../lib/ids';
import { input, output } from '../../types/tools/index';

const contextMessageSchema = z
  .looseObject({
    text: z.string().optional(),
    ts: z.string().optional(),
    user_id: z.string().optional(),
  })
  .transform((message) => ({
    text: message.text ?? '',
    ts: message.ts,
    userId: message.user_id,
  }));

const searchResponseSchema = z.looseObject({
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
              before: (message.context_messages?.before ?? [])
                .slice(-3)
                .map((item) => item.text.slice(0, 400)),
              after: (message.context_messages?.after ?? [])
                .slice(0, 3)
                .map((item) => item.text.slice(0, 400)),
              permalink: message.permalink,
            }))
        )
        .optional(),
    })
    .optional(),
});

export const searchSlackTool = createTool({
  id: 'search_slack',
  description:
    'Run one Slack message search for past conversations, decisions, links, people, or internal references. Use Slack search syntax to narrow by keywords, names, channels, senders, or dates. The search token expires roughly two minutes into the turn, so run all needed Slack searches early and batch them before other work. This returns one result page with short surrounding context. Use Slack code mode when the task needs multiple queries, exhaustive pagination, filtering, aggregation, or full conversation reads. Search requires a fresh token from an @mention.',
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
    if (!(thread && token)) {
      throw new Error(
        'No fresh Slack search token for this thread. Ask the user to mention the bot in a new message, then search again.'
      );
    }

    let response: z.infer<typeof searchResponseSchema>;
    try {
      response = searchResponseSchema.parse(
        await slack.webClient.apiCall('assistant.search.context', {
          action_token: token,
          content_types: ['messages'],
          cursor,
          include_context_messages: true,
          limit: 10,
          query,
        })
      );
    } catch (error) {
      const reason = String(error);
      if (
        reason.includes('invalid_action_token') ||
        reason.includes('token_expired')
      ) {
        await thread.setState({ searchToken: undefined });
        throw new Error(
          'The Slack search token expired. Ask the user to mention the bot in a new message, then search again.',
          { cause: error }
        );
      }
      throw error;
    }

    const messages = response.results?.messages ?? [];
    return {
      messages,
      nextCursor: response.response_metadata?.next_cursor || undefined,
    };
  },
});
