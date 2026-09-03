import {ApplicationContext, ApplicationFeatureAdapter, ApplicationFeatureContext, Lifecycle} from "@nodeboot/context";
import {ToolRegistry} from "@nodeboot/ai-core";
import {MCP_FEATURE} from "../types";
import {McpClientConfig, McpConfigProperties} from "../config";
import {createMcpTransport, McpClientToolCallbackProvider} from "../client";

/**
 * McpClientAdapter connects to every external MCP server declared under `mcp.clients` in
 * `app-config.yaml`, discovers their exposed tools and registers them into the global
 * `ToolRegistry` so they become available to any `ChatClient` call, exactly like locally
 * `@Tool`-decorated methods.
 *
 * Runs at the `application.adapters.bound` lifecycle phase (after all `@Tool` beans are already
 * registered), so remote MCP tools are simply merged on top of local ones.
 */
@Lifecycle("application.adapters.bound")
export class McpClientAdapter implements ApplicationFeatureAdapter {
    private readonly providers: McpClientToolCallbackProvider[] = [];

    async bind({logger, config}: ApplicationFeatureContext): Promise<void> {
        if (!ApplicationContext.get().applicationFeatures[MCP_FEATURE]) {
            return;
        }

        const mcpConfig = config.getOptional<McpConfigProperties>("mcp");
        const clients = mcpConfig?.clients ?? [];

        if (clients.length === 0) {
            return;
        }

        for (const clientConfig of clients) {
            await this.connect(clientConfig, logger);
        }
    }

    private async connect(clientConfig: McpClientConfig, logger: any): Promise<void> {
        try {
            const transport =
                clientConfig.transport === "stdio"
                    ? createMcpTransport({
                          type: "stdio",
                          params: {command: clientConfig.command, args: clientConfig.args, env: clientConfig.env},
                      })
                    : createMcpTransport({type: clientConfig.transport, url: clientConfig.url});

            const provider = await McpClientToolCallbackProvider.connect({
                name: clientConfig.name,
                transport,
            });

            this.providers.push(provider);

            const tools = await provider.getToolCallbacks();
            for (const tool of tools) {
                ToolRegistry.get().register(tool);
            }

            logger.info(
                `🔌 Connected to MCP server '${clientConfig.name}', registered ${tools.length} remote tool(s): [${tools
                    .map(t => t.definition.name)
                    .join(", ")}]`,
            );
        } catch (error: any) {
            logger.error(`Failed to connect to MCP server '${clientConfig.name}': ${error.message}`);
        }
    }

    public getProviders(): McpClientToolCallbackProvider[] {
        return this.providers;
    }
}
