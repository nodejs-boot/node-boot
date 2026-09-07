import {Body, Controller, Post} from "@nodeboot/core";
import {OpenAPI} from "@nodeboot/starter-openapi";
import {AiKnowledgeBaseService, TodoPrioritySuggestion, TodoSummary} from "../services/AiKnowledgeBaseService";
import {ChatRequestDto} from "../models";

/**
 * Generative-AI endpoints over the todo knowledge base, backed by Google Gemini
 * (`@nodeboot/ai-google-genai`) through `AiKnowledgeBaseService`.
 */
@Controller("/ai", "v1")
export class AiController {
    constructor(private readonly aiKnowledgeBaseService: AiKnowledgeBaseService) {}

    @Post("/chat")
    @OpenAPI({
        summary: "Chat with the todo knowledge base",
        description:
            "Ask questions or give instructions in natural language (e.g. 'What's still pending?' or " +
            "'Mark my grocery shopping todo as done'). The model can call tools to inspect and manage todos.",
    })
    async chat(@Body() body: ChatRequestDto): Promise<{reply: string}> {
        const reply = await this.aiKnowledgeBaseService.chat(body.conversationId, body.message);
        return {reply};
    }

    @Post("/summary")
    @OpenAPI({summary: "Generate an AI summary of the current todo knowledge base"})
    async summary(): Promise<TodoSummary> {
        return this.aiKnowledgeBaseService.summarize();
    }

    @Post("/prioritize")
    @OpenAPI({summary: "Ask the AI to suggest priorities for every pending todo"})
    async prioritize(): Promise<TodoPrioritySuggestion[]> {
        return this.aiKnowledgeBaseService.suggestPriorities();
    }
}
