import {ToolCallback, ToolContext} from "./ToolDefinition";
import {Message, ToolResponseMessage} from "../chat/messages";
import {ChatModel, ChatResponse} from "../chat/model";
import {Prompt} from "../prompt";

export interface ToolCallingOptions {
    maxIterations?: number;
    context?: ToolContext;
}

export class ToolCallingManager {
    private readonly tools: Map<string, ToolCallback>;

    constructor(tools: Array<ToolCallback> = []) {
        this.tools = new Map();
        for (const t of tools) {
            this.tools.set(t.definition.name, t);
        }
    }

    public addTool(tool: ToolCallback): void {
        this.tools.set(tool.definition.name, tool);
    }

    public async executeToolCalls(
        model: ChatModel,
        prompt: Prompt,
        options?: ToolCallingOptions,
    ): Promise<ChatResponse> {
        const maxIterations = options?.maxIterations ?? 10;
        let currentPrompt = prompt;
        let iteration = 0;

        while (iteration < maxIterations) {
            iteration++;
            const response = await model.call(currentPrompt);
            const assistantMsg = response.result?.message;

            if (!assistantMsg?.toolCalls || assistantMsg.toolCalls.length === 0) {
                return response;
            }

            const toolResponseMessages: ToolResponseMessage[] = [];

            for (const toolCall of assistantMsg.toolCalls) {
                const tool = this.tools.get(toolCall.name);
                let resultData: any;

                if (!tool) {
                    resultData = {error: `Tool '${toolCall.name}' not found`};
                } else {
                    try {
                        const args =
                            typeof toolCall.arguments === "string"
                                ? JSON.parse(toolCall.arguments || "{}")
                                : toolCall.arguments;

                        resultData = await tool.call(args, options?.context);
                    } catch (err: any) {
                        resultData = {error: err.message ?? String(err)};
                    }
                }

                toolResponseMessages.push(
                    new ToolResponseMessage({
                        toolCallId: toolCall.id,
                        name: toolCall.name,
                        responseData: resultData,
                    }),
                );
            }

            // Append assistant tool-call message + tool response messages to conversation
            const nextInstructions: Message[] = [
                ...currentPrompt.getInstructions(),
                assistantMsg,
                ...toolResponseMessages,
            ];

            currentPrompt = new Prompt(nextInstructions, currentPrompt.getOptions());
        }

        throw new Error(`Tool calling exceeded maximum iterations (${maxIterations})`);
    }
}
