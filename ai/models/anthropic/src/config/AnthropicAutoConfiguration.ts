import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {AnthropicModelConfigProperties} from "./types";
import {AnthropicChatModel} from "../AnthropicChatModel";

/**
 * Auto-configuration for Anthropic models in NodeBoot AI.
 */
@Configuration()
export class AnthropicAutoConfiguration {
    @Bean()
    public configureAnthropicModels({logger, config, iocContainer}: BeansContext): void {
        const anthropicConfig = config.getOptional<AnthropicModelConfigProperties>("ai.anthropic");

        if (anthropicConfig) {
            try {
                let AnthropicClient: any;
                try {
                    AnthropicClient = require("@anthropic-ai/sdk");
                    if (AnthropicClient.default) {
                        AnthropicClient = AnthropicClient.default;
                    } else if (AnthropicClient.Anthropic) {
                        AnthropicClient = AnthropicClient.Anthropic;
                    }
                } catch {
                    if (iocContainer.has("Anthropic")) {
                        AnthropicClient = iocContainer.get("Anthropic");
                    }
                }

                if (AnthropicClient) {
                    const clientInstance =
                        typeof AnthropicClient === "function"
                            ? new AnthropicClient({
                                  apiKey: anthropicConfig.apiKey,
                                  baseURL: anthropicConfig.baseURL,
                              })
                            : AnthropicClient;

                    const chatModel = new AnthropicChatModel(clientInstance, anthropicConfig.chat?.options);

                    iocContainer.set(AnthropicChatModel, chatModel);

                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 Anthropic ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn("🤖 Anthropic package not found. Please install '@anthropic-ai/sdk' as a dependency.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Anthropic models:", err);
            }
        }
    }
}
