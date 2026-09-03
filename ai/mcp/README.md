# @nodeboot/mcp

Model Context Protocol (MCP) client and server bridges for Node-Boot AI, built on top of the
official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).

This package lets a Node-Boot application:

-   **Act as an MCP client** — connect to any external MCP server (stdio, Streamable HTTP, or SSE)
    and expose its published tools as `@nodeboot/ai-core` `ToolCallback`s, ready to be used by
    `ChatClient` tool calling or registered in the global `ToolRegistry`.
-   **Act as an MCP server** — expose every `@Tool`-decorated method in your Node-Boot application
    (registered in the `ToolRegistry`) as a real MCP server, so external MCP clients (Claude
    Desktop, IDE agents, other Node-Boot apps, ...) can discover and invoke them. Also expose
    `@Resource`- and `@Prompt`-decorated methods, MCP-only concepts served the same way.

## Installation

```sh
pnpm add @nodeboot/mcp @nodeboot/ai-core @modelcontextprotocol/sdk zod
```

## Usage

### As an MCP client (consuming external MCP servers' tools)

```typescript
import {McpClientToolCallbackProvider, createMcpTransport} from "@nodeboot/mcp";
import {ChatClient} from "@nodeboot/ai-core";

const provider = await McpClientToolCallbackProvider.connect({
    name: "my-app-mcp-client",
    transport: createMcpTransport({
        type: "stdio",
        params: {command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]},
    }),
});

const tools = await provider.getToolCallbacks();

const chatClient = ChatClient.builder(chatModel)
    .defaultTools(...tools)
    .build();

const answer = await chatClient.prompt().user("List the files in /tmp").call().content();

await provider.close();
```

Supported transports: `stdio` (spawns a local MCP server process), `http` (Streamable HTTP,
recommended for remote servers), `sse` (legacy Server-Sent Events), and `custom` (pass any
SDK-compatible `Transport` instance directly).

#### The Node-Boot way: `@EnableMcp()` + injected `ChatClient`

The raw API above is useful outside a Node-Boot app (scripts, tests, one-off tools), but inside a
Node-Boot application you shouldn't manually connect providers or rebuild `ChatClient` — declare
your MCP clients in `app-config.yaml`, enable `@EnableMcp()`, and let `McpClientAdapter` connect
and merge every remote tool into the global `ToolRegistry` at startup. The auto-configured
`ChatClient` already wires that registry in by default, so just `@Inject()` it:

```typescript
import {NodeBootApplication, NodeBootApp} from "@nodeboot/core";
import {EnableAi} from "@nodeboot/ai-core";
import {EnableMcp} from "@nodeboot/mcp";
import {NodeBoot} from "@nodeboot/engine";
import {ExpressServer} from "@nodeboot/express-server";

@EnableAi()
@EnableMcp()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

```yaml
mcp:
    clients:
        - name: "filesystem"
          transport: "stdio"
          command: "npx"
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
```

```typescript
import {Inject, Service} from "@nodeboot/core";
import {ChatClient} from "@nodeboot/ai-core";

@Service()
export class FilesystemAssistantService {
    constructor(@Inject() private readonly chatClient: ChatClient) {}

    async listFiles() {
        // The "filesystem" MCP server's tools are already merged into the ToolRegistry by
        // McpClientAdapter — no manual provider connection or ChatClient rebuilding needed.
        return this.chatClient.prompt().user("List the files in /tmp").call().content();
    }
}
```

### As an MCP server (exposing your Node-Boot tools)

```typescript
import {NodeBootMcpServer, createMcpServerTransport} from "@nodeboot/mcp";
import {ToolRegistry} from "@nodeboot/ai-core";

const mcpServer = new NodeBootMcpServer({
    name: "my-app-mcp-server",
    tools: ToolRegistry.get().getAllTools(),
});

await mcpServer.start(createMcpServerTransport({type: "stdio"}));
```

The raw API above is for standalone use outside a Node-Boot app. Inside a Node-Boot application,
skip constructing `NodeBootMcpServer` yourself — `@EnableMcp()` with `mcp.server.enabled: true`
(below) starts and manages it for you from every `@Tool` already registered in the `ToolRegistry`
(plus any `@Resource`/`@Prompt` — see next section).

### Exposing MCP Resources and Prompts

`@Tool` is part of the provider-agnostic `ChatClient`/tool-calling abstraction in
`@nodeboot/ai-core`, so it works the same whether or not MCP is involved. **Resources** and
**Prompts**, on the other hand, are concepts specific to the MCP protocol — they have no
equivalent in `ChatClient` — so their decorators live directly in `@nodeboot/mcp` and are only
served over an app's MCP server.

```typescript
import {Service} from "@nodeboot/core";
import {Resource, Prompt} from "@nodeboot/mcp";

@Service()
export class KnowledgeBaseService {
    // Readable by URI via `resources/list` + `resources/read`.
    @Resource({
        uri: "kb://faq",
        description: "Frequently asked questions, as JSON",
        mimeType: "application/json",
    })
    async faqResource() {
        return JSON.stringify(await this.loadFaq());
    }

    // Listable/expandable via `prompts/list` + `prompts/get`.
    @Prompt({
        name: "summarize_faq",
        description: "Ask the assistant to summarize the FAQ",
        arguments: [{name: "topic", description: "Optional topic filter", required: false}],
    })
    summarizeFaqPrompt(args: {topic?: string}) {
        // A plain string is a shorthand for a single `user` text message; return an array of
        // `PromptMessage`s instead for multi-turn templates.
        return `Summarize the FAQ${args.topic ? ` about ${args.topic}` : ""}.`;
    }
}
```

Both decorators register into their own process-wide singletons (`ResourceRegistry`,
`PromptRegistry`), exactly like `@Tool` registers into `ToolRegistry` — and, like `@Tool`, they
bind on the `persistence.started` lifecycle event, so beans can depend on repositories through
normal constructor injection.

### Declarative, config-driven setup with `@EnableMcp()`

Rather than wiring clients/servers manually, decorate your application class with `@EnableMcp()`
and drive everything from `app-config.yaml`:

```typescript
import {NodeBootApplication, NodeBootApp} from "@nodeboot/core";
import {EnableAi} from "@nodeboot/ai-core";
import {EnableMcp} from "@nodeboot/mcp";
import {NodeBoot} from "@nodeboot/engine";
import {ExpressServer} from "@nodeboot/express-server";

@EnableAi()
@EnableMcp()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

```yaml
mcp:
    server:
        enabled: true
        name: my-app-mcp-server
        transport: stdio # or "http"
    clients:
        - name: filesystem
          transport: stdio
          command: npx
          args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
        - name: remote-tools
          transport: http
          url: https://example.com/mcp
```

-   `mcp.server.enabled: true` starts a real MCP server exposing every `@Tool`/`@Resource`/`@Prompt`
    registered in `ToolRegistry`/`ResourceRegistry`/`PromptRegistry` — it only starts once every
    `application.started`/`persistence.started` adapter (including `@Tool`/`@Resource`/`@Prompt`
    registration) has already bound, so the tool/resource/prompt lists are always complete.
-   Each entry under `mcp.clients` is connected automatically at startup, and its remote tools are
    merged into the global `ToolRegistry`, becoming available to any `ChatClient` call exactly like
    local tools.

## Testing without a real subprocess or HTTP server

Use the SDK's `InMemoryTransport.createLinkedPair()` to wire a `NodeBootMcpServer` and an
`McpClientToolCallbackProvider` directly together in-process — see `test/McpBridge.test.ts` for a
full example.

## Notes

-   The MCP server is built on the SDK's low-level `Server` (not the higher-level `McpServer`),
    because Node-Boot tools use raw JSON Schema for their input schema, while `McpServer` expects
    Zod shapes. This mirrors how Spring AI's `McpToolProvider`/`McpToolCallback` bridge arbitrary
    JSON-schema tool definitions.
-   Tool call results are bridged as MCP `text` content blocks; JSON-serializable results are
    stringified and parsed back to structured data on the client side automatically.
