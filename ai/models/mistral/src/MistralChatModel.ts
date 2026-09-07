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
import {MistralChatOptions} from "./MistralChatOptions";

export interface MistralChatClientLike {
    chat: {
        complete(params: any): Promise<any>;
    };
}

export class MistralChatModel implements ChatModel {
    private readonly client: MistralChatClientLike;
    private readonly defaultOptions: MistralChatOptions;

    constructor(client: MistralChatClientLike, defaultOptions?: MistralChatOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "mistral-large-latest",
            temperature: 0.7,
            ...defaultOptions,
        };
    }

    getDefaultOptions(): MistralChatOptions {
        return this.defaultOptions;
    }

    async call(prompt: PromptLike): Promise<ChatResponse> {
        const instructions = prompt.getInstructions();
        const promptOptions = prompt.getOptions?.() ?? {};
        const options: MistralChatOptions = {...this.defaultOptions, ...promptOptions};

        const mistralMessages: any[] = instructions.map(msg => {
            if (msg.messageType === "user") {
                if (msg.media && msg.media.length > 0) {
                    const contentParts: any[] = [{type: "text", text: msg.text}];
                    for (const media of msg.media) {
                        let url: string;
                        if (typeof media.data === "string") {
                            url = media.data;
                        } else if (Buffer.isBuffer(media.data)) {
                            url = `data:${media.mimeType};base64,${media.data.toString("base64")}`;
                        } else {
                            url = String(media.data);
                        }
                        contentParts.push({
                            type: "image_url",
                            image_url: {url},
                        });
                    }
                    return {role: "user", content: contentParts};
                }
                return {role: "user", content: msg.text};
            }

            if (msg.messageType === "system") {
                return {role: "system", content: msg.text};
            }

            if (msg.messageType === "assistant") {
                const asst = msg as AssistantMessage;
                const out: any = {role: "assistant", content: asst.text || null};
                if (asst.toolCalls && asst.toolCalls.length > 0) {
                    out.tool_calls = asst.toolCalls.map(tc => ({
                        id: tc.id,
                        type: tc.type ?? "function",
                        function: {
                            name: tc.name,
                            arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments),
                        },
                    }));
                }
                return out;
            }

            if (msg.messageType === "tool") {
                const toolMsg = msg as any;
                return {
                    role: "tool",
                    tool_call_id: toolMsg.toolCallId,
                    content: toolMsg.text,
                };
            }

            return {role: "user", content: msg.text};
        });

        const params: any = {
            model: options.model ?? "mistral-large-latest",
            messages: mistralMessages,
            temperature: options.temperature,
            top_p: options.topP,
            max_tokens: options.maxTokens,
            stop: options.stopSequences,
            random_seed: options.randomSeed,
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
            if (options.toolChoice) {
                params.tool_choice = options.toolChoice;
            }
        }

        if (options.responseFormat) {
            params.response_format = options.responseFormat;
        }

        const completion = await this.client.chat.complete(params);
        const choice = completion.choices?.[0];

        let assistantToolCalls: ToolCall[] | undefined;
        if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
            assistantToolCalls = choice.message.tool_calls.map((tc: any) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments,
                type: tc.type,
            }));
        }

        const assistantMessage = new AssistantMessage({
            text: choice?.message?.content ?? "",
            toolCalls: assistantToolCalls,
        });

        const generation: Generation = {
            message: assistantMessage,
            metadata: {
                finishReason: choice?.finish_reason,
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
                          promptTokens: completion.usage.prompt_tokens,
                          completionTokens: completion.usage.completion_tokens,
                          totalTokens: completion.usage.total_tokens,
                      }
                    : undefined,
            },
        };
    }
}
