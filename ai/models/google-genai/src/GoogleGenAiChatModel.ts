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
import {GoogleGenAiChatOptions} from "./GoogleGenAiChatOptions";

export interface GoogleGenAiClientLike {
    models: {
        generateContent(params: any): Promise<any>;
    };
}

function toBase64Data(data: string | Buffer | URL): string {
    if (typeof data === "string") {
        if (data.startsWith("data:")) {
            return data.split(",", 2)[1] ?? "";
        }
        return data;
    }

    if (Buffer.isBuffer(data)) {
        return data.toString("base64");
    }

    return String(data);
}

function toFunctionArgs(args: string | Record<string, any>): Record<string, any> | string {
    if (typeof args !== "string") {
        return args;
    }

    try {
        return JSON.parse(args);
    } catch {
        return args;
    }
}

export class GoogleGenAiChatModel implements ChatModel {
    private readonly client: GoogleGenAiClientLike;
    private readonly defaultOptions: GoogleGenAiChatOptions;

    constructor(client: GoogleGenAiClientLike, defaultOptions?: GoogleGenAiChatOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "gemini-2.0-flash",
            ...defaultOptions,
        };
    }

    getDefaultOptions(): GoogleGenAiChatOptions {
        return this.defaultOptions;
    }

    async call(prompt: PromptLike): Promise<ChatResponse> {
        const instructions = prompt.getInstructions();
        const promptOptions = prompt.getOptions?.() ?? {};
        const options: GoogleGenAiChatOptions = {...this.defaultOptions, ...promptOptions};

        const systemInstruction = instructions
            .filter(msg => msg.messageType === "system")
            .map(msg => msg.text)
            .join("\n\n");

        const contents: any[] = [];
        for (const msg of instructions) {
            if (msg.messageType === "system") {
                continue;
            }

            if (msg.messageType === "user") {
                const parts: any[] = [];
                if (msg.text) {
                    parts.push({text: msg.text});
                }
                for (const media of msg.media ?? []) {
                    parts.push({
                        inlineData: {
                            mimeType: media.mimeType,
                            data: toBase64Data(media.data),
                        },
                    });
                }
                contents.push({role: "user", parts: parts.length > 0 ? parts : [{text: ""}]});
                continue;
            }

            if (msg.messageType === "assistant") {
                const assistant = msg as AssistantMessage;
                const parts: any[] = [];
                if (assistant.text) {
                    parts.push({text: assistant.text});
                }
                for (const toolCall of assistant.toolCalls ?? []) {
                    parts.push({
                        functionCall: {
                            name: toolCall.name,
                            args: toFunctionArgs(toolCall.arguments),
                        },
                    });
                }
                contents.push({role: "model", parts: parts.length > 0 ? parts : [{text: ""}]});
                continue;
            }

            if (msg.messageType === "tool") {
                const toolMessage = msg as any;
                contents.push({
                    role: "user",
                    parts: [
                        {
                            functionResponse: {
                                name: toolMessage.name,
                                response: toolMessage.responseData,
                            },
                        },
                    ],
                });
                continue;
            }

            contents.push({role: "user", parts: [{text: msg.text}]});
        }

        const config: any = {
            systemInstruction: systemInstruction || undefined,
            temperature: options.temperature,
            topP: options.topP,
            topK: options.topK,
            maxOutputTokens: options.maxOutputTokens,
            stopSequences: options.stopSequences,
        };

        if (options.tools && options.tools.length > 0) {
            config.tools = [
                {
                    functionDeclarations: options.tools.map((tool: ToolDefinition | ToolCallback) => {
                        const definition: ToolDefinition = "definition" in tool ? tool.definition : tool;
                        return {
                            name: definition.name,
                            description: definition.description,
                            parameters: definition.inputSchema,
                        };
                    }),
                },
            ];
        }

        const response = await this.client.models.generateContent({
            model: options.model ?? "gemini-2.0-flash",
            contents,
            config,
        });
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];

        const text = parts
            .filter((part: any) => typeof part.text === "string")
            .map((part: any) => part.text)
            .join("");

        const toolCalls: ToolCall[] = parts
            .map((part: any, index: number) => {
                if (!part.functionCall) {
                    return undefined;
                }

                return {
                    id: part.functionCall.id ?? `${part.functionCall.name}-${index}`,
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args ?? {}),
                    type: "function",
                } as ToolCall;
            })
            .filter((toolCall: ToolCall | undefined): toolCall is ToolCall => Boolean(toolCall));

        const assistantMessage = new AssistantMessage({
            text,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });

        const generation: Generation = {
            message: assistantMessage,
            metadata: {
                finishReason: candidate?.finishReason,
            },
        };

        return {
            result: generation,
            results: [generation],
            metadata: {
                model: options.model,
                usage: response.usageMetadata
                    ? {
                          promptTokens: response.usageMetadata.promptTokenCount,
                          completionTokens: response.usageMetadata.candidatesTokenCount,
                          totalTokens: response.usageMetadata.totalTokenCount,
                      }
                    : undefined,
            },
        };
    }
}
