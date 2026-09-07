import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {DmrModelConfigProperties} from "./types";
import {DmrChatModel} from "../DmrChatModel";

const DEFAULT_BASE_URL = "http://localhost:12434/engines/llama.cpp/v1";

/**
 * Auto-configuration for Dmr models in NodeBoot AI.
 */
@Configuration()
export class DmrAutoConfiguration {
    @Bean()
    public configureDmrModels({logger, config, iocContainer}: BeansContext): void {
        const dmrConfig = config.getOptional<DmrModelConfigProperties>("ai.dmr");

        if (dmrConfig) {
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
                                  apiKey: dmrConfig.apiKey,
                                  baseURL: dmrConfig.baseURL ?? DEFAULT_BASE_URL,
                              })
                            : OpenAIClient;

                    const chatModel = new DmrChatModel(clientInstance, dmrConfig.chat?.options);

                    iocContainer.set(DmrChatModel, chatModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info("🤖 Dmr ChatModel and ChatClient successfully configured");
                } else {
                    logger.warn("🤖 'openai' package not found. Please install 'openai' as a dependency to use Dmr.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Dmr models:", err);
            }
        }
    }
}
