import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {ToolCallback, ToolContext, ToolDefinition} from "@nodeboot/ai-core";

export interface McpClientOptions {
    /** Name reported to the MCP server as this client's identity. */
    name: string;
    version?: string;
    transport: Transport;
}

function extractContent(result: any): any {
    if (result?.structuredContent !== undefined) {
        return result.structuredContent;
    }

    if (Array.isArray(result?.content)) {
        const textParts = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text);

        if (textParts.length === result.content.length && textParts.length > 0) {
            // All parts are text: try to parse as JSON, otherwise return joined text
            const joined = textParts.join("\n");
            try {
                return JSON.parse(joined);
            } catch {
                return joined;
            }
        }

        return result.content;
    }

    return result;
}

/**
 * Bridges a single MCP tool exposed by a remote MCP server into a NodeBoot AI `ToolCallback`,
 * so it can be used seamlessly by `ChatClient` tool calling and the `ToolCallingManager`.
 */
export class McpClientToolCallback implements ToolCallback {
    readonly definition: ToolDefinition;
    private readonly client: Client;

    constructor(client: Client, definition: ToolDefinition) {
        this.client = client;
        this.definition = definition;
    }

    async call(input: any, _context?: ToolContext): Promise<any> {
        const result = await this.client.callTool({
            name: this.definition.name,
            arguments: input ?? {},
        });

        if ((result as any).isError) {
            const message = extractContent(result);
            throw new Error(
                `MCP tool '${this.definition.name}' returned an error: ${
                    typeof message === "string" ? message : JSON.stringify(message)
                }`,
            );
        }

        return extractContent(result);
    }
}

/**
 * Connects to a remote MCP server and exposes its published tools as NodeBoot AI `ToolCallback`
 * instances, ready to be registered with a `ChatClient` (via `.defaultTools()` / `.tools()`) or
 * the global `ToolRegistry`.
 *
 * Wraps the official `@modelcontextprotocol/sdk` `Client`, supporting stdio, Streamable HTTP,
 * and SSE transports (see `createMcpTransport`).
 *
 * @example
 * ```typescript
 * const provider = await McpClientToolCallbackProvider.connect({
 *     name: "nodeboot-ai-client",
 *     transport: createMcpTransport({
 *         type: "stdio",
 *         params: { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] },
 *     }),
 * });
 *
 * const tools = await provider.getToolCallbacks();
 * const chatClient = ChatClient.builder(chatModel).defaultTools(...tools).build();
 * ```
 */
export class McpClientToolCallbackProvider {
    private readonly client: Client;

    private constructor(client: Client) {
        this.client = client;
    }

    static async connect(options: McpClientOptions): Promise<McpClientToolCallbackProvider> {
        const client = new Client({
            name: options.name,
            version: options.version ?? "1.0.0",
        });
        await client.connect(options.transport);
        return new McpClientToolCallbackProvider(client);
    }

    getClient(): Client {
        return this.client;
    }

    async getToolCallbacks(): Promise<ToolCallback[]> {
        const {tools} = await this.client.listTools();
        return tools.map(
            tool =>
                new McpClientToolCallback(this.client, {
                    name: tool.name,
                    description: tool.description ?? `MCP Tool: ${tool.name}`,
                    inputSchema: tool.inputSchema ?? {type: "object", properties: {}},
                }),
        );
    }

    async close(): Promise<void> {
        await this.client.close();
    }
}
