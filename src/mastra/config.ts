const MINUTE = 60 * 1000;
const EXECUTION_TIMEOUT = 20 * MINUTE;

export const sandbox = {
  template: 'gorkie-workspace:2.0',
  // Longest a single command or code mode program may run.
  executionTimeout: EXECUTION_TIMEOUT,
  // VM lifetime, and it has to exceed `executionTimeout` rather than match the
  // old 8 minute idle window. `processors/sandbox.ts` only re-arms this between
  // tool calls, so a command that runs longer than the armed window gets no
  // re-arm while it works, the lifetime expires underneath it, and E2B kills
  // the VM outright instead of pausing it, losing the work. Idle cost barely
  // changes because a healthy turn pauses the sandbox explicitly when it ends
  // rather than waiting for this to expire.
  timeout: EXECUTION_TIMEOUT + MINUTE,
  workdir: '/home/user',
};

export const agent = {
  id: 'orchestrator',
  maxTokens: { input: 1_000_000, output: 65_536 },
  maxSteps: 1000,
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
