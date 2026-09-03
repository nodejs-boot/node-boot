import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {InMemoryTransport} from "@modelcontextprotocol/sdk/inMemory.js";
import {AssistantMessage, ChatClient, ChatModel, FunctionToolCallback} from "@nodeboot/ai-core";
import {McpClientToolCallbackProvider, NodeBootMcpServer} from "../src";

describe("MCP Server + Client bridge (real @modelcontextprotocol/sdk)", () => {
    it("should expose NodeBoot tools over a real MCP server and invoke them from a real MCP client", async () => {
        const sumTool = new FunctionToolCallback(
            {
                name: "calculateSum",
                description: "Add two numbers",
                inputSchema: {
                    type: "object",
                    properties: {a: {type: "number"}, b: {type: "number"}},
                    required: ["a", "b"],
                },
            },
            (args: {a: number; b: number}) => ({result: args.a + args.b}),
        );

        const mcpServer = new NodeBootMcpServer({
            name: "test-mcp-server",
            tools: [sumTool],
        });

        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        await mcpServer.start(serverTransport);

        const provider = await McpClientToolCallbackProvider.connect({
            name: "test-mcp-client",
            transport: clientTransport,
        });

        try {
            const tools = await provider.getToolCallbacks();
            assert.equal(tools.length, 1);
            assert.equal(tools[0]!.definition.name, "calculateSum");
            assert.equal(tools[0]!.definition.description, "Add two numbers");

            const result = await tools[0]!.call({a: 15, b: 27});
            assert.deepEqual(result, {result: 42});
        } finally {
            await provider.close();
            await mcpServer.stop();
        }
    });

    it("should surface MCP tool errors as thrown errors on the client side", async () => {
        const failingTool = new FunctionToolCallback(
            {
                name: "alwaysFails",
                description: "A tool that always throws",
                inputSchema: {type: "object", properties: {}},
            },
            () => {
                throw new Error("boom");
            },
        );

        const mcpServer = new NodeBootMcpServer({name: "test-mcp-server", tools: [failingTool]});
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await mcpServer.start(serverTransport);

        const provider = await McpClientToolCallbackProvider.connect({
            name: "test-mcp-client",
            transport: clientTransport,
        });

        try {
            const tools = await provider.getToolCallbacks();
            await assert.rejects(() => tools[0]!.call({}), /boom/);
        } finally {
            await provider.close();
            await mcpServer.stop();
        }
    });

    it("should let ChatClient execute a remote MCP tool via tool calling", async () => {
        const sumTool = new FunctionToolCallback(
            {
                name: "calculateSum",
                description: "Add two numbers",
                inputSchema: {
                    type: "object",
                    properties: {a: {type: "number"}, b: {type: "number"}},
                    required: ["a", "b"],
                },
            },
            (args: {a: number; b: number}) => ({result: args.a + args.b}),
        );

        const mcpServer = new NodeBootMcpServer({name: "test-mcp-server", tools: [sumTool]});
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        await mcpServer.start(serverTransport);

        const provider = await McpClientToolCallbackProvider.connect({
            name: "test-mcp-client",
            transport: clientTransport,
        });

        try {
            const tools = await provider.getToolCallbacks();

            let turn = 0;
            const mockModel: ChatModel = {
                async call(_p: any) {
                    turn++;
                    if (turn === 1) {
                        return {
                            result: {
                                message: new AssistantMessage({
                                    toolCalls: [
                                        {
                                            id: "mcp_call_1",
                                            name: "calculateSum",
                                            arguments: JSON.stringify({a: 15, b: 27}),
                                        },
                                    ],
                                }),
                            },
                        };
                    }
                    return {
                        result: {message: new AssistantMessage("The sum is 42.")},
                    };
                },
            };

            const chatClient = ChatClient.builder(mockModel)
                .defaultTools(...tools)
                .build();

            const answer = await chatClient.prompt().user("Add 15 and 27").call().content();

            assert.equal(answer, "The sum is 42.");
        } finally {
            await provider.close();
            await mcpServer.stop();
        }
    });
});
