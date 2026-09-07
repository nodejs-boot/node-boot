import {Service} from "@nodeboot/core";
import {Tool} from "@nodeboot/ai-core";
import {TodoService} from "./TodoService";
import {TodoPriority} from "../persistence";

/**
 * Every `@Tool`-decorated method here is registered in the global `ToolRegistry`
 * (`@nodeboot/ai-core`, enabled via `@EnableAi()`), and exposed as a real MCP tool by
 * `@nodeboot/mcp`'s `McpServerAdapter` (enabled via `@EnableMcp()` + `mcp.server.enabled: true`
 * in `app-config.yaml`). Any MCP client — Claude Desktop, an IDE agent, another Node-Boot app
 * using `@nodeboot/mcp`'s client side, ... — can discover and call these tools over stdio.
 *
 * `TodoService` is injected normally through the constructor: `@nodeboot/ai-core`'s `ToolAdapter`
 * registers `@Tool` methods on the `persistence.started` lifecycle event, which fires only after
 * `@nodeboot/starter-persistence` has finished connecting the `DataSource` and binding every
 * repository, so `TodoRepository` (and therefore `TodoService`) is always available by then.
 */
@Service()
export class TodoMcpToolsService {
    constructor(private readonly todoService: TodoService) {}

    @Tool({
        name: "list_todos",
        description: "List todo items, optionally filtering to only pending (not completed) ones",
        inputSchema: {
            type: "object",
            properties: {
                onlyPending: {type: "boolean", description: "When true, only return todos that are not completed yet"},
            },
        },
    })
    async listTodos(input: {onlyPending?: boolean}) {
        const todos = await this.todoService.list(input?.onlyPending ?? false);
        return todos.map(this.toToolResult);
    }

    @Tool({
        name: "search_todos",
        description: "Search todos by free-text query across title and description",
        inputSchema: {
            type: "object",
            properties: {
                query: {type: "string", description: "Free-text search query"},
            },
            required: ["query"],
        },
    })
    async searchTodos(input: {query: string}) {
        const todos = await this.todoService.search(input.query);
        return todos.map(this.toToolResult);
    }

    @Tool({
        name: "add_todo",
        description: "Add a new todo item",
        inputSchema: {
            type: "object",
            properties: {
                title: {type: "string", description: "Short title of the todo"},
                description: {type: "string", description: "Optional longer description"},
                priority: {type: "string", enum: ["low", "medium", "high"], description: "Priority of the todo"},
            },
            required: ["title"],
        },
    })
    async addTodo(input: {title: string; description?: string; priority?: TodoPriority}) {
        const todo = await this.todoService.create(input);
        return this.toToolResult(todo);
    }

    @Tool({
        name: "update_todo",
        description: "Update the title, description or priority of an existing todo by its numeric id",
        inputSchema: {
            type: "object",
            properties: {
                id: {type: "number", description: "The id of the todo to update"},
                title: {type: "string", description: "New title"},
                description: {type: "string", description: "New description"},
                priority: {type: "string", enum: ["low", "medium", "high"], description: "New priority"},
            },
            required: ["id"],
        },
    })
    async updateTodo(input: {id: number; title?: string; description?: string; priority?: TodoPriority}) {
        const {id, ...data} = input;
        const todo = await this.todoService.update(id, data);
        return this.toToolResult(todo);
    }

    @Tool({
        name: "complete_todo",
        description: "Mark a todo item as completed by its numeric id",
        inputSchema: {
            type: "object",
            properties: {
                id: {type: "number", description: "The id of the todo to complete"},
            },
            required: ["id"],
        },
    })
    async completeTodo(input: {id: number}) {
        const todo = await this.todoService.complete(input.id);
        return this.toToolResult(todo);
    }

    @Tool({
        name: "delete_todo",
        description: "Permanently delete a todo item by its numeric id",
        inputSchema: {
            type: "object",
            properties: {
                id: {type: "number", description: "The id of the todo to delete"},
            },
            required: ["id"],
        },
    })
    async deleteTodo(input: {id: number}) {
        await this.todoService.delete(input.id);
        return {deleted: true, id: input.id};
    }

    private toToolResult = (todo: Awaited<ReturnType<TodoService["findById"]>>) => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        priority: todo.priority,
    });
}
