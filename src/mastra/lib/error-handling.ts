import {
  isBadRequestError,
  PrefillErrorHandler,
  ProviderHistoryCompat,
  StreamErrorRetryProcessor,
} from '@mastra/core/processors';

const econnresetMaxRetries = 2;
const econnresetRetryInitialDelayMs = 1000;
const econnresetRetryMaxDelayMs = 30_000;
const econnresetMessagePattern = /econnreset|socket hang up/i;

function isEconnresetError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : undefined;
  if (typeof code === 'string' && code.toUpperCase() === 'ECONNRESET') {
    return true;
  }

  return error instanceof Error && econnresetMessagePattern.test(error.message);
}

export function defaultErrorProcessors() {
  return [
    new StreamErrorRetryProcessor({
      retryUnknownErrors: true,
      maxRetries: 2,
      delayMs: 3000,
      matchers: [
        { match: isBadRequestError, maxRetries: 1, delayMs: 2000 },
        {
          match: isEconnresetError,
          maxRetries: econnresetMaxRetries,
          delayMs: ({ retryCount }) =>
            Math.min(
              econnresetRetryInitialDelayMs * 2 ** retryCount,
              econnresetRetryMaxDelayMs
            ),
        },
      ],
    }),
    new PrefillErrorHandler(),
    new ProviderHistoryCompat(),
  ];
}
