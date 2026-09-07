import {Service} from "@nodeboot/core";
import {Resource, Prompt} from "@nodeboot/mcp";
import {TodoService} from "./TodoService";

/**
 * Exposes the Todo list as MCP Resources (readable by URI) and MCP Prompts (parameterized
 * message templates), in addition to the `@Tool`-decorated CRUD operations in
 * `TodoMcpToolsService`.
 *
 * Resources and Prompts are MCP-only concepts — unlike `@Tool`, they aren't part of the
 * provider-agnostic `ChatClient`/tool-calling abstraction from `@nodeboot/ai-core` — so their
 * decorators live in `@nodeboot/mcp` and are only served over the MCP protocol, to any client
 * connected to this app's MCP server.
 */
@Service()
export class TodoResourcesAndPromptsService {
    constructor(private readonly todoService: TodoService) {}

    @Resource({
        uri: "todos://all",
        description: "Every todo item in the knowledge base, as JSON",
        mimeType: "application/json",
    })
    async allTodosResource() {
        return JSON.stringify(await this.todoService.list());
    }

    @Resource({
        uri: "todos://pending",
        description: "Only the todo items that are not completed yet, as JSON",
        mimeType: "application/json",
    })
    async pendingTodosResource() {
        return JSON.stringify(await this.todoService.list(true));
    }

    @Prompt({
        name: "prioritize_todos",
        description: "Ask the assistant to prioritize the current pending todo list",
        arguments: [{name: "focus", description: "Optional focus area, e.g. 'deadlines'", required: false}],
    })
    async prioritizeTodosPrompt(args: {focus?: string}) {
        const pending = await this.todoService.list(true);
        const list = pending.map(todo => `- (${todo.priority}) ${todo.title}`).join("\n");
        return (
            `Here is my current pending todo list:\n${list}\n\n` +
            `Please suggest a priority order${args.focus ? `, focusing on ${args.focus}` : ""}.`
        );
    }

    @Prompt({
        name: "summarize_todos",
        description: "Ask the assistant to summarize the current todo list",
    })
    summarizeTodosPrompt() {
        return "Please summarize my todo list, grouping items by priority and completion status.";
    }
}
