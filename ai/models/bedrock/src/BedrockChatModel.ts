import {AssistantMessage, ChatModel, ChatResponse, Generation, PromptLike} from "@nodeboot/ai-core";
import {BedrockChatOptions} from "./BedrockChatOptions";

export interface BedrockClientLike {
    converse(params: any): Promise<any>;
}

export class BedrockChatModel implements ChatModel {
    private readonly client: BedrockClientLike;
    private readonly defaultOptions: BedrockChatOptions;

    constructor(client: BedrockClientLike, defaultOptions?: BedrockChatOptions) {
        this.client = client;
        this.defaultOptions = {
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            temperature: 0.7,
            ...defaultOptions,
        };
    }

    getDefaultOptions(): BedrockChatOptions {
        return this.defaultOptions;
    }

    async call(prompt: PromptLike): Promise<ChatResponse> {
        const instructions = prompt.getInstructions();
        const promptOptions = prompt.getOptions?.() ?? {};
        const options: BedrockChatOptions = {...this.defaultOptions, ...promptOptions};

        const system = instructions.filter(msg => msg.messageType === "system").map(msg => ({text: msg.text}));

        const messages = instructions
            .filter(msg => msg.messageType !== "system")
            .map(msg => ({
                role: msg.messageType === "assistant" ? "assistant" : "user",
                content: [{text: msg.text}],
            }));

        const inferenceConfig: Record<string, any> = {};
        if (options.temperature !== undefined) {
            inferenceConfig["temperature"] = options.temperature;
        }
        if (options.topP !== undefined) {
            inferenceConfig["topP"] = options.topP;
        }
        if (options.maxTokens !== undefined) {
            inferenceConfig["maxTokens"] = options.maxTokens;
        }
        if (options.stopSequences !== undefined) {
            inferenceConfig["stopSequences"] = options.stopSequences;
        }

        const params: Record<string, any> = {
            modelId: options.modelId ?? "anthropic.claude-3-5-sonnet-20241022-v2:0",
            messages,
        };

        if (system.length > 0) {
            params["system"] = system;
        }

        if (Object.keys(inferenceConfig).length > 0) {
            params["inferenceConfig"] = inferenceConfig;
        }

        const completion = await this.client.converse(params);
        const content = completion.output?.message?.content ?? [];
        const text = content
            .filter((part: any) => typeof part?.text === "string")
            .map((part: any) => part.text)
            .join("\n");

        const assistantMessage = new AssistantMessage(text);
        const generation: Generation = {
            message: assistantMessage,
            metadata: {
                finishReason: completion.stopReason,
            },
        };

        return {
            result: generation,
            results: [generation],
            metadata: {
                model: completion.modelId ?? params["modelId"],
                usage: completion.usage
                    ? {
                          promptTokens: completion.usage.inputTokens,
                          completionTokens: completion.usage.outputTokens,
                          totalTokens: completion.usage.totalTokens,
                      }
                    : undefined,
            },
        };
    }
}
