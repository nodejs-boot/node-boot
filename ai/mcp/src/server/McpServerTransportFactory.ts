import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export type McpServerTransportOptions =
    | {type: "stdio"}
    | {type: "http"; sessionIdGenerator?: () => string; stateless?: boolean}
    | {type: "custom"; transport: Transport};

/**
 * Creates an MCP server-side Transport instance from simplified NodeBoot configuration options.
 */
export function createMcpServerTransport(options: McpServerTransportOptions): Transport {
    switch (options.type) {
        case "stdio":
            return new StdioServerTransport();
        case "http":
            return new StreamableHTTPServerTransport({
                // Stateless mode: an explicit `undefined` (as opposed to simply omitting the
                // option) tells the SDK to never generate/track a session id, so every request is
                // handled independently with no in-memory session state.
                sessionIdGenerator: options.stateless
                    ? undefined
                    : options.sessionIdGenerator ?? (() => crypto.randomUUID()),
            });
        case "custom":
            return options.transport;
        default:
            throw new Error(`Unsupported MCP server transport type: ${(options as any).type}`);
    }
}
