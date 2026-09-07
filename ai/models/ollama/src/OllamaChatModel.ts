import {
    AssistantMessage,
    ChatModel,
    ChatResponse,
    Generation,
    PromptLike,
    ToolCall,
    ToolCallback,
    ToolDefinition,
} from "@nodeboot/ai-core";
import {OllamaChatOptions} from "./OllamaChatOptions";

export interface OllamaChatClientLike {
    chat(params: any): Promise<any>;
}

export class OllamaChatModel implements ChatModel {
    private readonly client: OllamaChatClientLike;
    private readonly defaultOptions: OllamaChatOptions;

    constructor(client: OllamaChatClientLike, defaultOptions?: OllamaChatOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "llama3.2",
            ...defaultOptions,
        };
    }

    getDefaultOptions(): OllamaChatOptions {
        return this.defaultOptions;
    }

    async call(prompt: PromptLike): Promise<ChatResponse> {
        const instructions = prompt.getInstructions();
        const promptOptions = prompt.getOptions?.() ?? {};
        const options: OllamaChatOptions = {...this.defaultOptions, ...promptOptions};

        const ollamaMessages = instructions.map(msg => {
            if (msg.messageType === "user") {
                const message: any = {
                    role: "user",
                    content: msg.text,
                };

                if (msg.media && msg.media.length > 0) {
                    message.images = msg.media.map(media => {
                        if (typeof media.data === "string") {
                            if (media.data.startsWith("data:") && media.data.includes(",")) {
                                return media.data.split(",", 2)[1];
                            }
                            return media.data;
                        }

                        if (Buffer.isBuffer(media.data)) {
                            return media.data.toString("base64");
                        }

                        return String(media.data);
                    });
                }

                return message;
            }

            if (msg.messageType === "system") {
                return {role: "system", content: msg.text};
            }

            if (msg.messageType === "assistant") {
                const asst = msg as AssistantMessage;
                const out: any = {role: "assistant", content: asst.text};
                if (asst.toolCalls && asst.toolCalls.length > 0) {
                    out.tool_calls = asst.toolCalls.map(tc => ({
                        id: tc.id,
                        type: tc.type ?? "function",
                        function: {
                            name: tc.name,
                            arguments: tc.arguments,
                        },
                    }));
                }
                return out;
            }

            if (msg.messageType === "tool") {
                const toolMsg = msg as any;
                return {
                    role: "tool",
                    content: toolMsg.text,
                    tool_call_id: toolMsg.toolCallId,
                    name: toolMsg.name,
                };
            }

            return {role: "user", content: msg.text};
        });

        const params: any = {
            model: options.model ?? "llama3.2",
            messages: ollamaMessages,
            options: {
                temperature: options.temperature,
                top_p: options.topP,
                top_k: options.topK,
                num_predict: options.numPredict,
                stop: options.stopSequences,
            },
        };

        if (options.tools && options.tools.length > 0) {
            params.tools = options.tools.map((t: ToolDefinition | ToolCallback) => {
                const def: ToolDefinition = "definition" in t ? t.definition : t;
                return {
                    type: "function",
                    function: {
                        name: def.name,
                        description: def.description,
                        parameters: def.inputSchema,
                    },
                };
            });
        }

        const completion = await this.client.chat(params);
        const toolCalls = completion.message?.tool_calls?.map(
            (tc: any, index: number): ToolCall => ({
                id: tc.id ?? `tool-call-${index + 1}`,
                name: tc.function?.name ?? tc.name,
                arguments: tc.function?.arguments ?? tc.arguments ?? {},
                type: tc.type ?? "function",
            }),
        );

        const assistantMessage = new AssistantMessage({
            text: completion.message?.content ?? "",
            toolCalls,
        });

        const promptTokens = completion.prompt_eval_count;
        const completionTokens = completion.eval_count;
        const totalTokens =
            typeof promptTokens === "number" || typeof completionTokens === "number"
                ? (promptTokens ?? 0) + (completionTokens ?? 0)
                : undefined;

        const generation: Generation = {
            message: assistantMessage,
            metadata: {
                finishReason: completion.done_reason,
            },
        };

        return {
            result: generation,
            results: [generation],
            metadata: {
                model: completion.model,
                usage:
                    totalTokens !== undefined
                        ? {
                              promptTokens,
                              completionTokens,
                              totalTokens,
                          }
                        : undefined,
            },
        };
    }
}
