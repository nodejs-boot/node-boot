export interface McpStdioClientConfig {
    name: string;
    transport: "stdio";
    command: string;
    args?: string[];
    env?: Record<string, string>;
}

export interface McpHttpClientConfig {
    name: string;
    transport: "http" | "sse";
    url: string;
}

export type McpClientConfig = McpStdioClientConfig | McpHttpClientConfig;

export interface McpServerConfig {
    enabled?: boolean;
    name?: string;
    version?: string;
    transport?: "stdio" | "http";
    /**
     * Only applicable when `transport: "http"`. When `true`, the server runs in stateless mode:
     * no session id is generated/returned and no per-session state is kept in memory, so every
     * request is handled independently (recommended for horizontally-scaled/serverless-style
     * deployments). Defaults to `false` (stateful, session-based) to match the MCP SDK default.
     */
    stateless?: boolean;
}

export interface McpConfigProperties {
    server?: McpServerConfig;
    clients?: McpClientConfig[];
}
