import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {EnableDI} from "@nodeboot/di";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {EnableComponentScan} from "@nodeboot/aot";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableAi} from "@nodeboot/ai-core";
import {EnableMcp} from "@nodeboot/mcp";

/**
 * Todo MCP Server sample: exposes a Todo list as a real Model Context Protocol (MCP) server over
 * the streamable-HTTP transport (stateless mode), so any MCP client (Claude Desktop, an IDE
 * agent, another Node-Boot app, ...) can list, search, add, update, complete and delete todos
 * (via `@Tool`s), read the todo list as structured data (via `@Resource`s), and use ready-made
 * prompt templates for prioritizing/summarizing todos (via `@Prompt`s).
 *
 * `@EnableMcp()` (with `mcp.server.enabled: true` / `mcp.server.transport: http` /
 * `mcp.server.stateless: true` in app-config.yaml) starts the MCP server from every
 * `@Tool`-decorated method in `TodoMcpToolsService` and every `@Resource`/`@Prompt`-decorated
 * method in `TodoResourcesAndPromptsService`. Because the server runs stateless HTTP, no session
 * id is generated/tracked and every request is handled independently - the `McpHttpController`
 * (a regular Node-Boot `@Controller`) forwards real HTTP requests on `POST/GET/DELETE /mcp` to
 * the underlying `StreamableHTTPServerTransport` via `getMcpServerTransport()`.
 */
@EnableDI(Container)
@EnableRepositories()
@EnableAi()
@EnableMcp()
@EnableComponentScan()
@NodeBootApplication()
export class TodoMcpServerApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
