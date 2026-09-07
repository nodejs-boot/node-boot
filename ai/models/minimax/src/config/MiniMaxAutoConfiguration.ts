import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {MiniMaxModelConfigProperties} from "./types";
import {MiniMaxChatModel} from "../MiniMaxChatModel";

const DEFAULT_BASE_URL = "https://api.minimax.io/v1";

/**
 * Auto-configuration for MiniMax models in NodeBoot AI.
 */
@Configuration()
export class MiniMaxAutoConfiguration {
    @Bean()
    public configureMiniMaxModels({logger, config, iocContainer}: BeansContext): void {
        const minimaxConfig = config.getOptional<MiniMaxModelConfigProperties>("ai.minimax");

        if (minimaxConfig) {
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
                                  apiKey: minimaxConfig.apiKey,
                                  baseURL: minimaxConfig.baseURL ?? DEFAULT_BASE_URL,
                              })
                            : OpenAIClient;

                    const chatModel = new MiniMaxChatModel(clientInstance, minimaxConfig.chat?.options);

                    iocContainer.set(MiniMaxChatModel, chatModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 MiniMax ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn(
                        "🤖 'openai' package not found. Please install 'openai' as a dependency to use MiniMax.",
                    );
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure MiniMax models:", err);
            }
        }
    }
}
