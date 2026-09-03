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
import {AnthropicChatOptions} from "./AnthropicChatOptions";

export interface AnthropicClientLike {
    messages: {
        create(params: any): Promise<any>;
    };
}

export class AnthropicChatModel implements ChatModel {
    private readonly client: AnthropicClientLike;
    private readonly defaultOptions: AnthropicChatOptions;

    constructor(client: AnthropicClientLike, defaultOptions?: AnthropicChatOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "claude-3-5-sonnet-20241022",
            temperature: 0.7,
            maxTokens: 4096,
            ...defaultOptions,
        };
    }

    getDefaultOptions(): AnthropicChatOptions {
        return this.defaultOptions;
    }

    async call(prompt: PromptLike): Promise<ChatResponse> {
        const instructions = prompt.getInstructions();
        const promptOptions = prompt.getOptions?.() ?? {};
        const options: AnthropicChatOptions = {...this.defaultOptions, ...promptOptions};

        const systemMessages = instructions
            .filter(msg => msg.messageType === "system")
            .map(msg => msg.text)
            .filter(Boolean);

        const anthropicMessages: any[] = instructions
            .filter(msg => msg.messageType !== "system")
            .map(msg => {
                if (msg.messageType === "user") {
                    if (msg.media && msg.media.length > 0) {
                        const contentParts: any[] = [];

                        if (msg.text) {
                            contentParts.push({type: "text", text: msg.text});
                        }

                        for (const media of msg.media) {
                            const imageBlock = this.toAnthropicImageBlock(media.mimeType, media.data);
                            if (imageBlock) {
                                contentParts.push(imageBlock);
                            }
                        }

                        if (contentParts.length === 1 && contentParts[0].type === "text") {
                            return {role: "user", content: msg.text};
                        }

                        return {
                            role: "user",
                            content: contentParts.length > 0 ? contentParts : msg.text,
                        };
                    }

                    return {role: "user", content: msg.text};
                }

                if (msg.messageType === "assistant") {
                    const asst = msg as AssistantMessage;
                    const contentParts: any[] = [];

                    if (asst.text) {
                        contentParts.push({type: "text", text: asst.text});
                    }

                    if (asst.toolCalls && asst.toolCalls.length > 0) {
                        contentParts.push(
                            ...asst.toolCalls.map(tc => ({
                                type: "tool_use",
                                id: tc.id,
                                name: tc.name,
                                input: this.parseToolArguments(tc.arguments),
                            })),
                        );
                    }

                    return {
                        role: "assistant",
                        content:
                            contentParts.length === 0
                                ? asst.text
                                : contentParts.length === 1 && contentParts[0].type === "text"
                                ? asst.text
                                : contentParts,
                    };
                }

                if (msg.messageType === "tool") {
                    const toolMsg = msg as any;
                    return {
                        role: "user",
                        content: [
                            {
                                type: "tool_result",
                                tool_use_id: toolMsg.toolCallId,
                                content: toolMsg.text,
                            },
                        ],
                    };
                }

                return {role: "user", content: msg.text};
            });

        const params: any = {
            model: options.model ?? "claude-3-5-sonnet-20241022",
            max_tokens: options.maxTokens ?? 4096,
            temperature: options.temperature,
            top_p: options.topP,
            top_k: options.topK,
            stop_sequences: options.stopSequences,
            messages: anthropicMessages,
        };

        if (systemMessages.length > 0) {
            params.system = systemMessages.join("\n\n");
        }

        if (options.tools && options.tools.length > 0 && options.toolChoice !== "none") {
            params.tools = options.tools.map((t: ToolDefinition | ToolCallback) => {
                const def: ToolDefinition = "definition" in t ? t.definition : t;
                return {
                    name: def.name,
                    description: def.description,
                    input_schema: def.inputSchema,
                };
            });

            const toolChoice = this.mapToolChoice(options.toolChoice);
            if (toolChoice) {
                params.tool_choice = toolChoice;
            }
        }

        const completion = await this.client.messages.create(params);

        const textParts = (completion.content ?? [])
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text ?? "");

        const assistantToolCalls: ToolCall[] | undefined =
            completion.content
                ?.filter((part: any) => part.type === "tool_use")
                .map((part: any) => ({
                    id: part.id,
                    name: part.name,
                    arguments: JSON.stringify(part.input ?? {}),
                    type: part.type,
                })) ?? undefined;

        const assistantMessage = new AssistantMessage({
            text: textParts.join(""),
            toolCalls: assistantToolCalls && assistantToolCalls.length > 0 ? assistantToolCalls : undefined,
        });

        const generation: Generation = {
            message: assistantMessage,
            metadata: {
                finishReason: completion.stop_reason,
            },
        };

        return {
            result: generation,
            results: [generation],
            metadata: {
                id: completion.id,
                model: completion.model,
                usage: completion.usage
                    ? {
                          promptTokens: completion.usage.input_tokens,
                          completionTokens: completion.usage.output_tokens,
                          totalTokens: completion.usage.input_tokens + completion.usage.output_tokens,
                      }
                    : undefined,
            },
        };
    }

    private mapToolChoice(toolChoice: AnthropicChatOptions["toolChoice"]): any {
        if (!toolChoice || toolChoice === "none") {
            return undefined;
        }

        if (toolChoice === "auto") {
            return {type: "auto"};
        }

        if (toolChoice === "required") {
            return {type: "any"};
        }

        if (typeof toolChoice === "string") {
            return {type: "tool", name: toolChoice};
        }

        if (typeof toolChoice === "object" && toolChoice.type === "function") {
            return {type: "tool", name: toolChoice.function.name};
        }

        return toolChoice;
    }

    private parseToolArguments(argumentsValue: ToolCall["arguments"]): any {
        if (typeof argumentsValue !== "string") {
            return argumentsValue;
        }

        try {
            return JSON.parse(argumentsValue || "{}");
        } catch {
            return argumentsValue;
        }
    }

    private toAnthropicImageBlock(mimeType: string, data: string | Buffer | URL): any | undefined {
        let mediaType = mimeType;
        let base64Data: string | undefined;

        if (Buffer.isBuffer(data)) {
            base64Data = data.toString("base64");
        } else if (typeof data === "string") {
            const dataUrlMatch = data.match(/^data:([^;]+);base64,(.+)$/);
            if (dataUrlMatch) {
                mediaType = dataUrlMatch[1] ?? mediaType;
                base64Data = dataUrlMatch[2];
            } else if (data.startsWith("http://") || data.startsWith("https://")) {
                return undefined;
            } else {
                base64Data = data;
            }
        } else if (data instanceof URL) {
            return undefined;
        }

        if (!base64Data) {
            return undefined;
        }

        return {
            type: "image",
            source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
            },
        };
    }
}
