import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "@/utils/logger";

export interface MCPServerConfig {
  id: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class MCPService {
  private clients: Map<string, Client> = new Map();

  /**
   * Connect to an MCP server using stdio transport.
   */
  async connectServer(config: MCPServerConfig): Promise<void> {
    try {
      logger.info('Connecting to MCP server', { id: config.id, command: config.command });

      // Fix undefined environment variables for TS
      const envVariables = Object.entries(process.env).reduce((acc, [key, val]) => {
        if (val !== undefined) acc[key] = val;
        return acc;
      }, {} as Record<string, string>);

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...envVariables, ...(config.env || {}) },
      });

      const client = new Client(
        { name: "raven-api-client", version: "1.0.0" },
        { capabilities: {} }
      );

      await client.connect(transport);
      this.clients.set(config.id, client);

      logger.info('Connected to MCP server successfully', { id: config.id });
    } catch (error) {
      logger.error('Failed to connect to MCP server', { id: config.id, error });
      throw error;
    }
  }

  /**
   * Get all tools from all connected MCP servers.
   */
  async getAllTools(): Promise<any[]> {
    const allTools: any[] = [];

    for (const [serverId, client] of this.clients.entries()) {
      try {
        const response: any = await client.request(
          { method: "tools/list" },
          { _type: "any" } as any
        );

        if (response && response.tools) {
          // Add a server identifier to the tool name to avoid collisions and know where to route
          const serverTools = response.tools.map((t: any) => ({
            ...t,
            _serverId: serverId
          }));
          allTools.push(...serverTools);
        }
      } catch (error) {
        logger.error('Failed to list tools for server', { serverId, error });
      }
    }

    return allTools;
  }

  /**
   * Call a specific tool on a specific server.
   */
  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`MCP client ${serverId} not found`);
    }

    try {
      logger.info('Calling MCP tool', { serverId, toolName });
      const response = await client.request(
        {
          method: "tools/call",
          params: { name: toolName, arguments: args }
        },
        { _type: "any" } as any
      );
      return response;
    } catch (error) {
      logger.error('Error calling MCP tool', { serverId, toolName, error });
      throw error;
    }
  }
}

export const mcpService = new MCPService();
