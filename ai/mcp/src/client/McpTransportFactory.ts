import type {Transport} from "@modelcontextprotocol/sdk/shared/transport.js";
import {StdioClientTransport, StdioServerParameters} from "@modelcontextprotocol/sdk/client/stdio.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js";

export type McpTransportOptions =
    | {type: "stdio"; params: StdioServerParameters}
    | {type: "http"; url: string | URL}
    | {type: "sse"; url: string | URL}
    | {type: "custom"; transport: Transport};

/**
 * Creates an MCP client Transport instance from simplified NodeBoot configuration options.
 *
 * Supports the three most common MCP transports:
 * - `stdio`: spawns a local MCP server process and communicates over stdin/stdout.
 * - `http`: connects to a remote MCP server using Streamable HTTP.
 * - `sse`: connects to a remote MCP server using Server-Sent Events (legacy transport).
 * - `custom`: pass any SDK-compatible Transport instance directly.
 */
export function createMcpTransport(options: McpTransportOptions): Transport {
    switch (options.type) {
        case "stdio":
            return new StdioClientTransport(options.params);
        case "http":
            return new StreamableHTTPClientTransport(new URL(options.url));
        case "sse":
            return new SSEClientTransport(new URL(options.url));
        case "custom":
            return options.transport;
        default:
            throw new Error(`Unsupported MCP transport type: ${(options as any).type}`);
    }
}
