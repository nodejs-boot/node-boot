import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {PerplexityModelConfigProperties} from "./types";
import {PerplexityChatModel} from "../PerplexityChatModel";

const DEFAULT_BASE_URL = "https://api.perplexity.ai";

/**
 * Auto-configuration for Perplexity models in NodeBoot AI.
 */
@Configuration()
export class PerplexityAutoConfiguration {
    @Bean()
    public configurePerplexityModels({logger, config, iocContainer}: BeansContext): void {
        const perplexityConfig = config.getOptional<PerplexityModelConfigProperties>("ai.perplexity");

        if (perplexityConfig) {
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
                                  apiKey: perplexityConfig.apiKey,
                                  baseURL: perplexityConfig.baseURL ?? DEFAULT_BASE_URL,
                              })
                            : OpenAIClient;

                    const chatModel = new PerplexityChatModel(clientInstance, perplexityConfig.chat?.options);

                    iocContainer.set(PerplexityChatModel, chatModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 Perplexity ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn(
                        "🤖 'openai' package not found. Please install 'openai' as a dependency to use Perplexity.",
                    );
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Perplexity models:", err);
            }
        }
    }
}
