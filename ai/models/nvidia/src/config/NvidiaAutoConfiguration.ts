import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {NvidiaModelConfigProperties} from "./types";
import {NvidiaChatModel} from "../NvidiaChatModel";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

/**
 * Auto-configuration for Nvidia models in NodeBoot AI.
 */
@Configuration()
export class NvidiaAutoConfiguration {
    @Bean()
    public configureNvidiaModels({logger, config, iocContainer}: BeansContext): void {
        const nvidiaConfig = config.getOptional<NvidiaModelConfigProperties>("ai.nvidia");

        if (nvidiaConfig) {
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
                                  apiKey: nvidiaConfig.apiKey,
                                  baseURL: nvidiaConfig.baseURL ?? DEFAULT_BASE_URL,
                              })
                            : OpenAIClient;

                    const chatModel = new NvidiaChatModel(clientInstance, nvidiaConfig.chat?.options);

                    iocContainer.set(NvidiaChatModel, chatModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 Nvidia ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn(
                        "🤖 'openai' package not found. Please install 'openai' as a dependency to use Nvidia.",
                    );
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Nvidia models:", err);
            }
        }
    }
}
