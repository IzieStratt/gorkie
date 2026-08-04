import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import type { ModelWithRetries } from '@mastra/core/agent';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { env } from '@/env';

const hackClubProvider = createOpenAICompatible({
  name: 'hackclub',
  baseURL: 'https://ai.hackclub.com/proxy/v1',
  apiKey: env.HACKCLUB_API_KEY,
});

const openRouterProvider = env.OPENROUTER_API_KEY
  ? createOpenAICompatible({
      name: 'openrouter',
      baseURL: env.OPENROUTER_BASE_URL,
      apiKey: env.OPENROUTER_API_KEY,
    })
  : null;

function gateways(id: string): LanguageModelV3[] {
  const hackClubId = id.replace(/^openrouter\//, '');
  return [
    hackClubProvider.chatModel(hackClubId),
    openRouterProvider?.chatModel(id),
  ].filter((model): model is LanguageModelV3 => Boolean(model));
}

const opencodeProvider = env.OPENCODE_API_KEY
  ? createOpenAICompatible({
      name: 'opencode-go',
      baseURL: 'https://opencode.ai/zen/go/v1',
      apiKey: env.OPENCODE_API_KEY,
    })
  : null;

function opencode(model: string): LanguageModelV3 {
  if (!opencodeProvider) throw new Error('OPENCODE_API_KEY is required');
  return wrapLanguageModel({
    model: opencodeProvider.chatModel(model),
    middleware: extractReasoningMiddleware({ tagName: 'think' }),
  });
}

export const orchestrator: ModelWithRetries[] = [
  ...gateways('openrouter/minimax/minimax-m3').map((model) => ({
    model,
    maxRetries: 3,
    providerOptions: { openrouter: { reasoningEffort: 'medium' } },
  })),
  { model: opencode('gpt-5.6-luna'), maxRetries: 3 },
];

export const summarizer: ModelWithRetries[] = [
  ...gateways('openrouter/google/gemini-3.1-flash-lite').map((model) => ({ model, maxRetries: 3 })),
  { model: opencode('mimo-v2.5'), maxRetries: 3 },
];

export const scout: ModelWithRetries[] = [
  ...gateways('openrouter/deepseek/deepseek-v4-flash').map((model) => ({ model, maxRetries: 3 })),
  { model: opencode('gpt-5.6-luna'), maxRetries: 3 },
];

export const explorer: ModelWithRetries[] = [
  ...gateways('openrouter/minimax/minimax-m3').map((model) => ({ model, maxRetries: 3 })),
  { model: opencode('gpt-5.6-luna'), maxRetries: 3 },
];

export const images = {
  id: 'google/gemini-3.1-flash-image',
  apiKey: env.HACKCLUB_API_KEY,
  url: 'https://ai.hackclub.com/proxy/v1',
};
