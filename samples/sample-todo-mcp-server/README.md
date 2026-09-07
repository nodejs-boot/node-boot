# Todo MCP Server sample

A Node-Boot sample application exposing a Todo list as a real **Model Context Protocol (MCP)**
server, built with [`@nodeboot/mcp`](https://github.com/nodejs-boot/node-boot/blob/main/ai/mcp/README.md)
on top of [`@nodeboot/ai-core`](https://github.com/nodejs-boot/node-boot/blob/main/ai/core/README.md)'s
`@Tool` decorator. Any MCP client (Claude Desktop, an IDE agent, or another Node-Boot app acting as
an MCP client) can:

-   **Call tools**: `list_todos`, `search_todos`, `add_todo`, `update_todo`, `complete_todo`,
    `delete_todo`.
-   **Read resources**: `todos://all`, `todos://pending` (the todo list as structured JSON).
-   **Expand prompts**: `prioritize_todos`, `summarize_todos` (ready-made message templates).

## What it demonstrates

-   **No HTTP layer** — built on [`GhostServer`](https://github.com/nodejs-boot/node-boot/blob/main/servers/ghost-server/README.md),
    the same pure-IoC pattern as [`sample-ghost-server`](../sample-ghost-server).
-   **`@Tool` decorator** (`TodoMcpToolsService`) — plain `@Service` methods become callable AI
    tools just by adding `@Tool({...})`, registered in the global `ToolRegistry`
    (`@nodeboot/ai-core`).
-   **`@Resource` and `@Prompt` decorators** (`TodoResourcesAndPromptsService`) — MCP-only
    concepts (`@nodeboot/mcp`), letting clients read the todo list as structured data by URI
    and expand reusable prompt templates, independently of tool-calling.
-   **`@EnableMcp()` as an MCP server** — `mcp.server.enabled: true` in `app-config.yaml` starts a
    real MCP server over the `stdio` transport, exposing every registered tool, resource and
    prompt.
-   **SQLite persistence** (`@nodeboot/starter-persistence`) — todos survive process restarts.
    `@Tool`/`@Resource`/`@Prompt` beans are injected with `TodoRepository`-backed services through
    plain constructor injection: registration runs on the `persistence.started` lifecycle event,
    which only fires once every repository is bound.

## Running standalone

```sh
pnpm install
pnpm build
node dist/server.js
```

The process doesn't print anything to stdout by itself (stdout is reserved for the MCP protocol —
see the comment at the top of `src/server.ts`); all Node-Boot logs go to stderr instead. You can
talk to it with any MCP client, or use the SDK's `stdio` client transport
(`createMcpTransport({type: "stdio", params: {command: "node", args: ["dist/server.js"]}})`, see
the `ai/mcp` README) to connect programmatically.

## Using it from Claude Desktop

Add this to Claude Desktop's `claude_desktop_config.json` (after `pnpm build`):

```json
{
    "mcpServers": {
        "todo": {
            "command": "node",
            "args": ["/absolute/path/to/samples/sample-todo-mcp-server/dist/server.js"]
        }
    }
}
```

Restart Claude Desktop, and it will discover the 6 todo tools, 2 resources and 2 prompts
automatically — try asking it to "add a todo to buy milk" or "what's still pending on my todo
list?".

## Using it from another Node-Boot app

Any Node-Boot app with [`@nodeboot/mcp`](https://github.com/nodejs-boot/node-boot/blob/main/ai/mcp/README.md)
can connect to this server as an MCP **client** and merge its tools into its own `ChatClient`:

```yaml
mcp:
    clients:
        - name: "todos"
          transport: "stdio"
          command: "node"
          args: ["/absolute/path/to/samples/sample-todo-mcp-server/dist/server.js"]
```

See [`sample-ai-todo-knowledge-base`](../sample-ai-todo-knowledge-base) for a sample that talks to
its own local todos directly through `ChatClient`, without going through MCP — the two samples
demonstrate the same domain served through the two different Node-Boot AI integration styles.

## Configuration

See [`app-config.yaml`](./app-config.yaml):

-   `persistence` — SQLite (`better-sqlite3`) storage for todos (`synchronize: true`, demo-only —
    use migrations in production, see [`sample-express`](../sample-express)).
-   `ai` — enables `@nodeboot/ai-core`'s `ToolRegistry`/`@Tool` discovery (no model provider needed
    here — this app only serves tools, it doesn't call an LLM itself).
-   `mcp.server` — `enabled: true`, `transport: stdio`, exposing every `@Tool` in the app.
