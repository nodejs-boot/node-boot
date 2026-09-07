import {Service} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {ChatClient, ChatMemory, MessageChatMemoryAdvisor} from "@nodeboot/ai-core";
import {Logger} from "winston";
import {TodoService} from "./TodoService";

export interface TodoSummary {
    totalTodos: number;
    pendingTodos: number;
    completedTodos: number;
    summary: string;
    highlights: string[];
}

export interface TodoPrioritySuggestion {
    id: number;
    title: string;
    suggestedPriority: "low" | "medium" | "high";
    reason: string;
}

/**
 * Generative-AI layer of the Todo knowledge base, built on top of `@nodeboot/ai-core`'s
 * `ChatClient` (backed by Google Gemini via `@nodeboot/ai-google-genai`).
 *
 * - `chat(...)` lets a user hold a natural-language conversation about their todos — the model
 *   can call `TodoToolsService`'s tools (list/search/create/complete/delete) on its own to
 *   ground its answers and act on the user's behalf.
 * - `summarize(...)` and `suggestPriorities(...)` showcase structured/generative output over the
 *   same knowledge base without any tool calling, using `ChatClientResponseSpec#entity()`.
 */
@Service()
export class AiKnowledgeBaseService {
    constructor(
        @Inject() private readonly chatClient: ChatClient,
        @Inject("ChatMemory") private readonly chatMemory: ChatMemory,
        private readonly todoService: TodoService,
        private readonly logger: Logger,
    ) {}

    /**
     * Conversational entry point over the todo knowledge base. Chat memory keeps context across
     * calls for the same `conversationId`, and the model can transparently call the todo tools
     * registered by `TodoToolsService` (e.g. "mark my grocery todo as done").
     */
    async chat(conversationId: string, message: string): Promise<string> {
        this.logger.info(`[${conversationId}] Asking Gemini: ${message}`);
        return this.chatClient
            .prompt()
            .system(
                "You are a helpful assistant for a personal todo knowledge base. Use the available " +
                    "tools to inspect and manage the user's todos whenever relevant, and always answer " +
                    "concisely in plain text.",
            )
            .user(message)
            .advisors(new MessageChatMemoryAdvisor({chatMemory: this.chatMemory}))
            .conversationId(conversationId)
            .call()
            .content();
    }

    /** Generates a natural-language summary of the current state of the todo knowledge base. */
    async summarize(): Promise<TodoSummary> {
        const todos = await this.todoService.list();
        const pending = todos.filter(todo => !todo.completed);

        return this.chatClient
            .prompt()
            .user(
                "Here is the current todo list as JSON: {todos}\n\n" +
                    "Return a JSON object with fields: totalTodos (number), pendingTodos (number), " +
                    "completedTodos (number), summary (a short 2-3 sentence natural-language summary), " +
                    "and highlights (an array of up to 3 short strings calling out the most important or " +
                    "urgent pending todos). Only return the JSON object, nothing else.",
            )
            .param("todos", JSON.stringify(todos.map(todo => ({...todo, id: undefined}))))
            .call()
            .entity<TodoSummary>({
                type: "object",
                properties: {
                    totalTodos: {type: "number"},
                    pendingTodos: {type: "number"},
                    completedTodos: {type: "number"},
                    summary: {type: "string"},
                    highlights: {type: "array", items: {type: "string"}},
                },
                required: ["totalTodos", "pendingTodos", "completedTodos", "summary", "highlights"],
            })
            .catch(() => ({
                totalTodos: todos.length,
                pendingTodos: pending.length,
                completedTodos: todos.length - pending.length,
                summary: "Unable to generate an AI summary right now.",
                highlights: [],
            }));
    }

    /** Asks the model to suggest a priority re-shuffle for every pending todo. */
    async suggestPriorities(): Promise<TodoPrioritySuggestion[]> {
        const pending = (await this.todoService.list()).filter(todo => !todo.completed);
        if (pending.length === 0) {
            return [];
        }

        return this.chatClient
            .prompt()
            .user(
                "Here are the pending todos as JSON: {todos}\n\n" +
                    "Suggest a priority (low, medium or high) for each one, with a short one-sentence " +
                    "reason. Return a JSON array of objects with fields: id (number), title (string), " +
                    "suggestedPriority (low|medium|high) and reason (string). Only return the JSON array.",
            )
            .param(
                "todos",
                JSON.stringify(
                    pending.map(({id, title, description, priority}) => ({id, title, description, priority})),
                ),
            )
            .call()
            .entity<TodoPrioritySuggestion[]>({
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: {type: "number"},
                        title: {type: "string"},
                        suggestedPriority: {type: "string", enum: ["low", "medium", "high"]},
                        reason: {type: "string"},
                    },
                    required: ["id", "title", "suggestedPriority", "reason"],
                },
            });
    }
}
