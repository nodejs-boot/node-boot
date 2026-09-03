import {ApplicationContext} from "@nodeboot/context";
import {MCP_FEATURE} from "../types";
import {McpClientAdapter, McpServerAdapter} from "../adapter";

/**
 * Enables Model Context Protocol (MCP) capabilities in the NodeBoot application.
 *
 * Activates, based on `mcp.*` settings in `app-config.yaml`:
 * - An MCP **server** exposing every `@Tool`-decorated method registered in the global
 *   `ToolRegistry` (enable with `mcp.server.enabled: true`).
 * - MCP **clients** connecting to any number of external MCP servers declared under
 *   `mcp.clients`, whose remote tools are merged into the `ToolRegistry` and become available
 *   to any `ChatClient` call, exactly like local tools.
 *
 * @example
 * ```yaml
 * mcp:
 *   server:
 *     enabled: true
 *     name: my-app-mcp-server
 *     transport: stdio
 *   clients:
 *     - name: filesystem
 *       transport: stdio
 *       command: npx
 *       args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
 *     - name: remote-tools
 *       transport: http
 *       url: https://example.com/mcp
 * ```
 *
 * @example
 * ```typescript
 * @EnableAi()
 * @EnableMcp()
 * @NodeBootApplication()
 * export class MyApp implements NodeBootApp {
 *     start() {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 */
export const EnableMcp = (): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures[MCP_FEATURE] = true;
        ApplicationContext.get().applicationFeatureAdapters.push(new McpServerAdapter());
        ApplicationContext.get().applicationFeatureAdapters.push(new McpClientAdapter());
    };
};
