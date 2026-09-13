export const sandbox = {
  template: 'gorkie-workspace:2.0',
  // Longest a single command or code mode program may run.
  executionTimeout: 15 * 60 * 1000,
  timeout: 16 * 60 * 1000,
  workdir: '/home/user',
};

export const agent = {
  id: 'orchestrator',
  maxTokens: { input: 1_000_000, output: 65_536 },
  maxSteps: 1000,
  // Per model-call cap. A stepMs timeout is not retried against the same model,
  // it advances to the next fallback, so a provider that opens a stream then
  // stalls no longer hangs the turn.
  stepTimeoutMs: 2 * 60 * 1000,
};

export const summarizer = {
  id: 'summarizer',
  maxTokens: { output: 32_768 },
};

export const scheduledTasks = {
  minInterval: 30 * 60 * 1000,
};

export const workingModel = {
  ttl: 30 * 60 * 1000,
};
