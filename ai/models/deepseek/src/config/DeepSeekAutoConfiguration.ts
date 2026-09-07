import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {DeepSeekModelConfigProperties} from "./types";
import {DeepSeekChatModel} from "../DeepSeekChatModel";

const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";

/**
 * Auto-configuration for DeepSeek models in NodeBoot AI.
 */
@Configuration()
export class DeepSeekAutoConfiguration {
    @Bean()
    public configureDeepSeekModels({logger, config, iocContainer}: BeansContext): void {
        const deepseekConfig = config.getOptional<DeepSeekModelConfigProperties>("ai.deepseek");

        if (deepseekConfig) {
            try {
                let OpenAIClient: any;
                try {
                    OpenAIClient = require("openai");
                    if (OpenAIClient.default) {
                        OpenAIClient = OpenAIClient.default;
                    }
                } catch {
                    // Fallback to DI container if an OpenAI-compatible client was registered elsewhere
                    if (iocContainer.has("OpenAI")) {
                        OpenAIClient = iocContainer.get("OpenAI");
                    }
                }

                if (OpenAIClient) {
                    const clientInstance =
                        typeof OpenAIClient === "function"
                            ? new OpenAIClient({
                                  apiKey: deepseekConfig.apiKey,
                                  baseURL: deepseekConfig.baseURL ?? DEFAULT_BASE_URL,
                              })
                            : OpenAIClient;

                    const chatModel = new DeepSeekChatModel(clientInstance, deepseekConfig.chat?.options);

                    iocContainer.set(DeepSeekChatModel, chatModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 DeepSeek ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn(
                        "🤖 'openai' package not found. Please install 'openai' as a dependency to use DeepSeek.",
                    );
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure DeepSeek models:", err);
            }
        }
    }
}
