import {Controller, Post, Get, Delete, Req, Res, Body} from "@nodeboot/core";
import type {Request, Response} from "express";
import {getMcpServerTransport} from "@nodeboot/mcp";
import type {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";

/**
 * Bridges real HTTP requests to the MCP server's `StreamableHTTPServerTransport` (stateless
 * mode, per `mcp.server.transport: http` + `mcp.server.stateless: true` in app-config.yaml).
 *
 * `@nodeboot/mcp` starts the MCP `Transport` itself (see `McpServerAdapter`), but doesn't (yet)
 * mount HTTP routes on its own - there is no per-driver route-mounting mechanism for MCP, unlike
 * `@nodeboot/starter-actuator`'s `ActuatorAdapter`. Until such a mechanism exists, a plain
 * `@Controller` such as this one is the supported way to forward real requests to
 * `transport.handleRequest(req, res, body)`.
 *
 * The MCP Streamable HTTP transport uses all three verbs on the very same endpoint:
 * - `POST /mcp`: carries JSON-RPC requests/notifications/responses from the client.
 * - `GET /mcp`: opens an SSE stream for server-initiated notifications (rejected with 405 by the
 *   SDK in stateless mode, since there is no session to attach a stream to).
 * - `DELETE /mcp`: closes a session (a no-op in stateless mode).
 */
@Controller("/mcp")
export class McpHttpController {
    @Post()
    async handlePost(@Req() req: Request, @Res() res: Response, @Body() body: any) {
        const transport = getMcpServerTransport() as StreamableHTTPServerTransport | undefined;
        if (!transport) {
            return res.status(503).json({error: "MCP server is not available"});
        }
        await transport.handleRequest(req, res, body);
        return res;
    }

    @Get()
    async handleGet(@Req() req: Request, @Res() res: Response) {
        const transport = getMcpServerTransport() as StreamableHTTPServerTransport | undefined;
        if (!transport) {
            return res.status(503).json({error: "MCP server is not available"});
        }
        await transport.handleRequest(req, res);
        return res;
    }

    @Delete()
    async handleDelete(@Req() req: Request, @Res() res: Response) {
        const transport = getMcpServerTransport() as StreamableHTTPServerTransport | undefined;
        if (!transport) {
            return res.status(503).json({error: "MCP server is not available"});
        }
        await transport.handleRequest(req, res);
        return res;
    }
}
