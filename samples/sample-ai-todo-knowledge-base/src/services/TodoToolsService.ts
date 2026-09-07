import {Service} from "@nodeboot/core";
import {Tool} from "@nodeboot/ai-core";
import {TodoService} from "./TodoService";
import {TodoPriority} from "../persistence";

/**
 * Exposes the Todo list as callable AI tools. Every `@Tool`-decorated method here is
 * automatically registered in the global `ToolRegistry` by `@nodeboot/ai-core` (enabled via
 * `@EnableAi()`), and the auto-configured `ChatClient` wires that registry in by default — so
 * `AiKnowledgeBaseService` can let Gemini list, create, complete, delete and search todos on
 * its own, purely by reasoning over natural language.
 *
 * `TodoService` is injected normally through the constructor: `@nodeboot/ai-core`'s `ToolAdapter`
 * registers `@Tool` methods on the `persistence.started` lifecycle event, which fires only after
 * `@nodeboot/starter-persistence` has finished connecting the `DataSource` and binding every
 * repository, so `TodoRepository` (and therefore `TodoService`) is always available by then.
 */
@Service()
export class TodoToolsService {
    constructor(private readonly todoService: TodoService) {}

    @Tool({
        name: "list_todos",
        description:
            "List the todo items in the knowledge base, optionally filtering to only pending (not completed) ones",
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
        description:
            "Search the todo knowledge base for items whose title, description or tags match a free-text query",
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
        name: "create_todo",
        description: "Create a new todo item in the knowledge base",
        inputSchema: {
            type: "object",
            properties: {
                title: {type: "string", description: "Short title of the todo"},
                description: {type: "string", description: "Optional longer description"},
                priority: {type: "string", enum: ["low", "medium", "high"], description: "Priority of the todo"},
                tags: {type: "string", description: "Optional comma-separated tags"},
            },
            required: ["title"],
        },
    })
    async createTodo(input: {title: string; description?: string; priority?: TodoPriority; tags?: string}) {
        const todo = await this.todoService.create(input);
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
        tags: todo.tags,
    });
}
