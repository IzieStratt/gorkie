import { MCPClient } from '@mastra/mcp';

export const mcpTools = await new MCPClient({
  id: 'mcp',
  servers: {
    context7: {
      url: new URL('https://mcp.context7.com/mcp'),
    },
  },
}).listTools();
