import type { ToolsInput } from '@mastra/core/agent';
import type { RequestContext } from '@mastra/core/request-context';
import { createCodeMode } from '@mastra/core/tools';
import { createWorkspaceTools } from '@mastra/core/workspace';
import { E2BCodeModeTransport } from '@mastra/e2b';
import { sandbox as sandboxConfig } from '../../config';
import { mcpTools } from '../../mcp';
import { codeModeFilesPrompt, codeModePrompt } from '../../prompts/code-mode';
import { codeModeToolNames, getSandbox, workspace } from '../../workspace';
import { canvasTools } from '../canvas';
import { grepTool } from '../grep';
import { slackTools } from '../slack';

const transport = new E2BCodeModeTransport();

const slackCodeTools = {
  ...mcpTools,
  search_slack: slackTools.search_slack,
  read_conversation_history: slackTools.read_conversation_history,
  list_threads: slackTools.list_threads,
  get_user: slackTools.get_user,
  get_channel_info: slackTools.get_channel_info,
  list_channels: slackTools.list_channels,
  get_permalink: slackTools.get_permalink,
  get_slack_file: slackTools.get_slack_file,
  summarize_thread: slackTools.summarize_thread,
  call_slack_api: slackTools.call_slack_api,
  list_canvases: canvasTools.list_canvases,
  read_canvas: canvasTools.read_canvas,
  lookup_canvas_sections: canvasTools.lookup_canvas_sections,
};

// Built per request, not once at module load: each set carries its own
// read-before-write tracker and write lock, and sharing those across threads
// would let one thread's sandbox satisfy or stale-fail another's writes.
async function getSandboxTools(
  requestContext?: RequestContext
): Promise<ToolsInput> {
  const tools = await createWorkspaceTools(workspace, {
    workspace,
    requestContext,
  });
  return {
    ...Object.fromEntries(
      Object.entries(tools).filter(([name]) => codeModeToolNames.has(name))
    ),
    grep: grepTool,
  };
}

async function createCodeModeInstance({
  sandboxAccess,
}: {
  sandboxAccess: boolean;
}) {
  const tools = sandboxAccess
    ? { ...slackCodeTools, ...(await getSandboxTools()) }
    : slackCodeTools;
  const modeConfig = { id: 'slack', timeout: sandboxConfig.timeout, tools };
  const mode = createCodeMode(modeConfig, transport);

  mode.tool.execute = async (input, context) => {
    if (!context.requestContext) {
      throw new Error('No request context available for Slack code mode.');
    }
    const sandbox = await getSandbox(context.requestContext);
    if (!sandbox) {
      throw new Error('No E2B sandbox available for Slack code mode.');
    }
    const {
      tool: { execute },
    } = createCodeMode(
      {
        ...modeConfig,
        sandbox,
        tools: sandboxAccess
          ? {
              ...slackCodeTools,
              ...(await getSandboxTools(context.requestContext)),
            }
          : slackCodeTools,
      },
      transport
    );
    if (!execute) {
      throw new Error('Slack code mode is not executable.');
    }
    return execute(input, context);
  };

  return mode;
}

export const slackCodeMode = await createCodeModeInstance({
  sandboxAccess: true,
});
export const slackCodeModePrompt = `${codeModePrompt(slackCodeMode.instructions)}\n\n${codeModeFilesPrompt}`;

export const readOnlySlackCodeMode = await createCodeModeInstance({
  sandboxAccess: false,
});
export const readOnlySlackCodeModePrompt = codeModePrompt(
  readOnlySlackCodeMode.instructions
);
