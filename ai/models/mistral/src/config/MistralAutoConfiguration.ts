import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {MistralModelConfigProperties} from "./types";
import {MistralChatModel} from "../MistralChatModel";
import {MistralEmbeddingModel} from "../MistralEmbeddingModel";
import {MistralModerationModel} from "../MistralModerationModel";

/**
 * Auto-configuration for Mistral models in NodeBoot AI.
 */
@Configuration()
export class MistralAutoConfiguration {
    @Bean()
    public configureMistralModels({logger, config, iocContainer}: BeansContext): void {
        const mistralConfig = config.getOptional<MistralModelConfigProperties>("ai.mistral");

        if (mistralConfig) {
            try {
                let MistralClient: any;
                try {
                    const pkg = require("@mistralai/mistralai");
                    MistralClient = pkg.Mistral ?? pkg.default?.Mistral ?? pkg.default;
                } catch {
                    // Fallback to DI container if Mistral client was registered elsewhere
                    if (iocContainer.has("Mistral")) {
                        MistralClient = iocContainer.get("Mistral");
                    }
                }

                if (MistralClient) {
                    const clientInstance =
                        typeof MistralClient === "function"
                            ? new MistralClient({apiKey: mistralConfig.apiKey, serverURL: mistralConfig.baseURL})
                            : MistralClient;

                    const chatModel = new MistralChatModel(clientInstance, mistralConfig.chat?.options);
                    const embeddingModel = new MistralEmbeddingModel(clientInstance, mistralConfig.embedding?.options);
                    const moderationModel = new MistralModerationModel(
                        clientInstance,
                        mistralConfig.moderation?.options,
                    );

                    iocContainer.set(MistralChatModel, chatModel);
                    iocContainer.set(MistralEmbeddingModel, embeddingModel);
                    iocContainer.set(MistralModerationModel, moderationModel);

                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info(
                        "🤖 Mistral ChatModel, EmbeddingModel, ModerationModel, and ChatClient successfully configured",
                    );
                } else {
                    logger.warn("🤖 Mistral package not found. Please install '@mistralai/mistralai' as a dependency.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Mistral models:", err);
            }
        }
    }
}
