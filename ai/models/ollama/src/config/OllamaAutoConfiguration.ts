import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {OllamaModelConfigProperties} from "./types";
import {OllamaClient} from "../OllamaClient";
import {OllamaChatModel} from "../OllamaChatModel";
import {OllamaEmbeddingModel} from "../OllamaEmbeddingModel";

/**
 * Auto-configuration for Ollama models in NodeBoot AI.
 */
@Configuration()
export class OllamaAutoConfiguration {
    @Bean()
    public configureOllamaModels({logger, config, iocContainer}: BeansContext): void {
        const ollamaConfig = config.getOptional<OllamaModelConfigProperties>("ai.ollama");

        if (ollamaConfig) {
            try {
                const client = new OllamaClient(ollamaConfig.baseURL ?? "http://localhost:11434");
                const chatModel = new OllamaChatModel(client, ollamaConfig.chat?.options);
                const embeddingModel = new OllamaEmbeddingModel(client, ollamaConfig.embedding?.options);

                iocContainer.set(OllamaChatModel, chatModel);
                iocContainer.set(OllamaEmbeddingModel, embeddingModel);

                const chatClient = ChatClient.create(chatModel);
                iocContainer.set(ChatClient, chatClient);

                logger.info("🤖 Ollama ChatModel, EmbeddingModel, and ChatClient successfully configured");
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Ollama models:", err);
            }
        }
    }
}
