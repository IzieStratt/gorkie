import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ModelWithRetries } from '@mastra/core/agent';
import { env } from '@/env';

export const hackclub = createOpenAICompatible({
  name: 'hackclub',
  baseURL: 'https://ai.hackclub.com/proxy/v1',
  apiKey: env.HACKCLUB_API_KEY,
});

export const opencode = createOpenAICompatible({
  name: 'opencode-go',
  baseURL: 'https://opencode.ai/zen/go/v1',
  apiKey: env.OPENCODE_API_KEY,
});

export const orchestrator: ModelWithRetries[] = [
  { model: hackclub('openai/gpt-5.6-luna'), maxRetries: 3 },
  { model: opencode('gpt-5.6-luna'), maxRetries: 3 },
];

export const summarizer: ModelWithRetries[] = [
  { model: hackclub('google/gemini-3.5-flash-lite'), maxRetries: 3 },
  { model: hackclub('xiaomi/mimo-v2.5'), maxRetries: 3 },
  { model: opencode('mimo-v2.5'), maxRetries: 3 },
];

export const scout: ModelWithRetries[] = [
  { model: hackclub('openai/gpt-5.6-luna'), maxRetries: 3 },
  { model: opencode('gpt-5.6-luna'), maxRetries: 3 },
];

export const explorer: ModelWithRetries[] = [
  { model: hackclub('openai/gpt-5.6-luna'), maxRetries: 3 },
  { model: opencode('gpt-5.6-luna'), maxRetries: 3 },
];

export const images = {
  model: 'google/gemini-3.1-flash-image',
  baseURL: 'https://ai.hackclub.com/proxy/v1',
};
