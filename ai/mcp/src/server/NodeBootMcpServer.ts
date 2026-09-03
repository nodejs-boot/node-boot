import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {
    CallToolRequestSchema,
    GetPromptRequestSchema,
    ListPromptsRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {ToolCallback} from "@nodeboot/ai-core";
import {ResourceCallback} from "../resource";
import {PromptCallback, PromptMessage} from "../prompt";

export interface NodeBootMcpServerOptions {
    name: string;
    version?: string;
    /** Tools to expose. Defaults to an empty list; use `registerTool`/`registerTools` to add more. */
    tools?: ToolCallback[];
    /** Resources to expose. Defaults to an empty list; use `registerResource(s)` to add more. */
    resources?: ResourceCallback[];
    /** Prompts to expose. Defaults to an empty list; use `registerPrompt(s)` to add more. */
    prompts?: PromptCallback[];
}

/**
 * Exposes NodeBoot AI `ToolCallback`s (e.g. beans annotated with `@Tool`, registered in the
 * `ToolRegistry`), as well as `@Resource`- and `@Prompt`-decorated beans, as a real Model Context
 * Protocol server, so external MCP clients (Claude Desktop, other NodeBoot apps, IDE agents,
 * etc.) can discover and invoke/read/expand them.
 *
 * Wraps the low-level `Server` from the official `@modelcontextprotocol/sdk`, bridging raw JSON
 * Schema tool definitions (as used across NodeBoot AI) directly to MCP's `tools/list` and
 * `tools/call` requests, without requiring Zod schemas. Resources and prompts are bridged the
 * same way to `resources/list`, `resources/read`, `prompts/list` and `prompts/get`.
 *
 * @example
 * ```typescript
 * const mcpServer = new NodeBootMcpServer({
 *     name: "nodeboot-app",
 *     tools: ToolRegistry.get().getAllTools(),
 *     resources: ResourceRegistry.get().getAllResources(),
 *     prompts: PromptRegistry.get().getAllPrompts(),
 * });
 * await mcpServer.start(new StdioServerTransport());
 * ```
 */
export class NodeBootMcpServer {
    private readonly server: Server;
    private readonly tools = new Map<string, ToolCallback>();
    private readonly resources = new Map<string, ResourceCallback>();
    private readonly prompts = new Map<string, PromptCallback>();

    constructor(options: NodeBootMcpServerOptions) {
        this.server = new Server(
            {name: options.name, version: options.version ?? "1.0.0"},
            {capabilities: {tools: {}, resources: {}, prompts: {}}},
        );

        for (const tool of options.tools ?? []) {
            this.tools.set(tool.definition.name, tool);
        }
        for (const resource of options.resources ?? []) {
            this.resources.set(resource.definition.uri, resource);
        }
        for (const prompt of options.prompts ?? []) {
            this.prompts.set(prompt.definition.name, prompt);
        }

        this.registerHandlers();
    }

    registerTool(tool: ToolCallback): void {
        this.tools.set(tool.definition.name, tool);
    }

    registerTools(tools: ToolCallback[]): void {
        for (const tool of tools) {
            this.registerTool(tool);
        }
    }

    registerResource(resource: ResourceCallback): void {
        this.resources.set(resource.definition.uri, resource);
    }

    registerResources(resources: ResourceCallback[]): void {
        for (const resource of resources) {
            this.registerResource(resource);
        }
    }

    registerPrompt(prompt: PromptCallback): void {
        this.prompts.set(prompt.definition.name, prompt);
    }

    registerPrompts(prompts: PromptCallback[]): void {
        for (const prompt of prompts) {
            this.registerPrompt(prompt);
        }
    }

    private registerHandlers(): void {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: Array.from(this.tools.values()).map(tool => ({
                name: tool.definition.name,
                description: tool.definition.description,
                inputSchema: tool.definition.inputSchema,
            })),
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async request => {
            const {name, arguments: args} = request.params;
            const tool = this.tools.get(name);

            if (!tool) {
                return {
                    isError: true,
                    content: [{type: "text", text: `Tool '${name}' not found`}],
                };
            }

            try {
                const result = await tool.call(args ?? {});
                const text = typeof result === "string" ? result : JSON.stringify(result);
                return {
                    content: [{type: "text", text}],
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{type: "text", text: error?.message ?? String(error)}],
                };
            }
        });

        this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
            resources: Array.from(this.resources.values()).map(resource => ({
                uri: resource.definition.uri,
                name: resource.definition.name,
                description: resource.definition.description,
                mimeType: resource.definition.mimeType,
            })),
        }));

        this.server.setRequestHandler(ReadResourceRequestSchema, async request => {
            const {uri} = request.params;
            const resource = this.resources.get(uri);

            if (!resource) {
                throw new Error(`Resource '${uri}' not found`);
            }

            const result = await resource.read(uri);
            const content = typeof result === "string" ? {text: result} : result;

            return {
                contents: [
                    {
                        uri,
                        mimeType: content.mimeType ?? resource.definition.mimeType,
                        ...(content.text !== undefined ? {text: content.text} : {}),
                        ...(content.blob !== undefined ? {blob: content.blob} : {}),
                    },
                ],
            };
        });

        this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
            prompts: Array.from(this.prompts.values()).map(prompt => ({
                name: prompt.definition.name,
                description: prompt.definition.description,
                arguments: prompt.definition.arguments,
            })),
        }));

        this.server.setRequestHandler(GetPromptRequestSchema, async request => {
            const {name, arguments: args} = request.params;
            const prompt = this.prompts.get(name);

            if (!prompt) {
                throw new Error(`Prompt '${name}' not found`);
            }

            const result = await prompt.render(args ?? {});
            const messages: PromptMessage[] =
                typeof result === "string" ? [{role: "user", content: {type: "text", text: result}}] : result;

            return {
                description: prompt.definition.description,
                messages,
            };
        });
    }

    async start(transport: Transport): Promise<void> {
        await this.server.connect(transport);
    }

    async stop(): Promise<void> {
        await this.server.close();
    }

    getServer(): Server {
        return this.server;
    }
}
