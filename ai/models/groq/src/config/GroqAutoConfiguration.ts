import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {GroqModelConfigProperties} from "./types";
import {GroqChatModel} from "../GroqChatModel";

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

/**
 * Auto-configuration for Groq models in NodeBoot AI.
 */
@Configuration()
export class GroqAutoConfiguration {
    @Bean()
    public configureGroqModels({logger, config, iocContainer}: BeansContext): void {
        const groqConfig = config.getOptional<GroqModelConfigProperties>("ai.groq");

        if (groqConfig) {
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
                                  apiKey: groqConfig.apiKey,
                                  baseURL: groqConfig.baseURL ?? DEFAULT_BASE_URL,
                              })
                            : OpenAIClient;

                    const chatModel = new GroqChatModel(clientInstance, groqConfig.chat?.options);

                    iocContainer.set(GroqChatModel, chatModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 Groq ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn("🤖 'openai' package not found. Please install 'openai' as a dependency to use Groq.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Groq models:", err);
            }
        }
    }
}
