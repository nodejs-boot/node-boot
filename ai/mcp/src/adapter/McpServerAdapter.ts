import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {ApplicationContext, ApplicationFeatureAdapter, ApplicationFeatureContext, Lifecycle} from "@nodeboot/context";
import {ToolRegistry} from "@nodeboot/ai-core";
import {MCP_FEATURE} from "../types";
import {McpConfigProperties} from "../config";
import {createMcpServerTransport, NodeBootMcpServer} from "../server";
import {ResourceRegistry} from "../resource";
import {PromptRegistry} from "../prompt";

/**
 * McpServerAdapter starts a real Model Context Protocol server exposing every NodeBoot AI tool
 * registered in the global `ToolRegistry` (i.e. every `@Tool`-decorated bean method), every
 * `@Resource`-decorated bean method (via `ResourceRegistry`), and every `@Prompt`-decorated bean
 * method (via `PromptRegistry`), so external MCP clients (Claude Desktop, IDEs, other agents,
 * ...) can discover and invoke/read/expand them.
 *
 * Runs at the `application.adapters.bound` lifecycle phase, which fires strictly after every
 * `application.started`/`persistence.started` adapter (including `@Tool`/`@Resource`/`@Prompt`
 * registration, which all run on `persistence.started`) has already bound, guaranteeing every
 * registry is fully populated before the MCP server starts advertising its capabilities.
 */
@Lifecycle("application.adapters.bound")
export class McpServerAdapter implements ApplicationFeatureAdapter {
    /**
     * The most recently bound `McpServerAdapter` instance, used by `getMcpServerTransport()` so
     * that HTTP-transport-based samples/apps can reach the live `Transport` (e.g. a
     * `StreamableHTTPServerTransport`) from a plain `@Controller` route and forward real HTTP
     * requests to `transport.handleRequest(req, res, body)`. NodeBoot doesn't yet ship a
     * per-driver route-mounting mechanism for MCP (unlike `@nodeboot/starter-actuator`'s
     * `ActuatorAdapter`), so this static accessor is the supported way to bridge the two until
     * such a mechanism exists.
     */
    private static current?: McpServerAdapter;

    private server?: NodeBootMcpServer;
    private transport?: Transport;

    async bind({logger, config}: ApplicationFeatureContext): Promise<void> {
        if (!ApplicationContext.get().applicationFeatures[MCP_FEATURE]) {
            return;
        }

        const mcpConfig = config.getOptional<McpConfigProperties>("mcp");
        const serverConfig = mcpConfig?.server;

        if (!serverConfig?.enabled) {
            logger.info(`🔌 MCP Server disabled. To enable it, set 'mcp.server.enabled: true' in your app-config.yaml`);
            return;
        }

        try {
            const tools = ToolRegistry.get().getAllTools();
            const resources = ResourceRegistry.get().getAllResources();
            const prompts = PromptRegistry.get().getAllPrompts();
            this.server = new NodeBootMcpServer({
                name: serverConfig.name ?? "nodeboot-ai-mcp-server",
                version: serverConfig.version,
                tools,
                resources,
                prompts,
            });

            const transportType = serverConfig.transport ?? "stdio";
            const transport = createMcpServerTransport(
                transportType === "http" ? {type: "http", stateless: serverConfig.stateless} : {type: "stdio"},
            );
            await this.server.start(transport);

            this.transport = transport;
            McpServerAdapter.current = this;

            logger.info(
                `🔌 MCP Server '${serverConfig.name ?? "nodeboot-ai-mcp-server"}' started over '${transportType}'${
                    transportType === "http" ? (serverConfig.stateless ? " (stateless)" : " (stateful)") : ""
                } transport, exposing ${tools.length} tool(s): [${tools.map(t => t.definition.name).join(", ")}]${
                    resources.length
                        ? `, ${resources.length} resource(s): [${resources.map(r => r.definition.uri).join(", ")}]`
                        : ""
                }${
                    prompts.length
                        ? `, ${prompts.length} prompt(s): [${prompts.map(p => p.definition.name).join(", ")}]`
                        : ""
                }`,
            );
        } catch (error: any) {
            logger.error(`Failed to start MCP Server: ${error.message}`);
        }
    }

    public getServer(): NodeBootMcpServer | undefined {
        return this.server;
    }

    /**
     * The live MCP `Transport` this adapter started (e.g. a `StreamableHTTPServerTransport` when
     * `mcp.server.transport: http`). Route handlers should forward the raw `req`/`res` to
     * `transport.handleRequest(req, res, body)`.
     */
    public getTransport(): Transport | undefined {
        return this.transport;
    }

    /**
     * Returns the `Transport` of the most recently bound MCP server in this process, so that a
     * plain HTTP `@Controller` route can be wired to `handleRequest()` without needing to inject
     * the adapter itself.
     */
    public static getCurrentTransport(): Transport | undefined {
        return McpServerAdapter.current?.transport;
    }
}

/**
 * Convenience function equivalent to `McpServerAdapter.getCurrentTransport()`, for use in a
 * `@Controller` route that bridges real HTTP requests to the MCP server's `Transport` when
 * `mcp.server.transport: http` (e.g. a stateless `StreamableHTTPServerTransport`).
 *
 * @example
 * ```ts
 * @Controller("/mcp")
 * export class McpHttpController {
 *     @Post()
 *     async handlePost(@Req() req: Request, @Res() res: Response, @Body() body: any) {
 *         const transport = getMcpServerTransport() as StreamableHTTPServerTransport;
 *         await transport.handleRequest(req, res, body);
 *         return res;
 *     }
 * }
 * ```
 */
export function getMcpServerTransport(): Transport | undefined {
    return McpServerAdapter.getCurrentTransport();
}
