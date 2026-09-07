import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {OpenAiModelConfigProperties} from "./types";
import {OpenAiChatModel} from "../OpenAiChatModel";
import {OpenAiEmbeddingModel} from "../OpenAiEmbeddingModel";
import {OpenAiImageModel} from "../OpenAiImageModel";
import {OpenAiAudioTranscriptionModel, OpenAiSpeechModel} from "../OpenAiAudioModel";
import {OpenAiModerationModel} from "../OpenAiModerationModel";

/**
 * Auto-configuration for OpenAI models in NodeBoot AI.
 */
@Configuration()
export class OpenAiAutoConfiguration {
    @Bean()
    public configureOpenAiModels({logger, config, iocContainer}: BeansContext): void {
        const openAiConfig =
            config.getOptional<OpenAiModelConfigProperties>("ai.openai") ??
            config.getOptional<OpenAiModelConfigProperties>("integrations.openai");

        if (openAiConfig) {
            try {
                let OpenAIClient: any;
                try {
                    OpenAIClient = require("openai");
                    if (OpenAIClient.default) {
                        OpenAIClient = OpenAIClient.default;
                    }
                } catch {
                    // Fallback to DI container if OpenAI client was registered by @nodeboot/starter-openai
                    if (iocContainer.has("OpenAI")) {
                        OpenAIClient = iocContainer.get("OpenAI");
                    }
                }

                if (OpenAIClient) {
                    const clientInstance =
                        typeof OpenAIClient === "function" ? new OpenAIClient(openAiConfig) : OpenAIClient;

                    const chatModel = new OpenAiChatModel(clientInstance, openAiConfig.chat?.options);
                    const embeddingModel = new OpenAiEmbeddingModel(clientInstance, openAiConfig.embedding?.options);
                    const imageModel = new OpenAiImageModel(clientInstance, openAiConfig.image?.options);
                    const audioTranscriptionModel = new OpenAiAudioTranscriptionModel(
                        clientInstance,
                        openAiConfig.audio?.transcription?.options,
                    );
                    const speechModel = new OpenAiSpeechModel(clientInstance, openAiConfig.audio?.speech?.options);
                    const moderationModel = new OpenAiModerationModel(clientInstance, openAiConfig.moderation?.options);

                    iocContainer.set(OpenAiChatModel, chatModel);
                    iocContainer.set(OpenAiEmbeddingModel, embeddingModel);
                    iocContainer.set(OpenAiImageModel, imageModel);
                    iocContainer.set(OpenAiAudioTranscriptionModel, audioTranscriptionModel);
                    iocContainer.set(OpenAiSpeechModel, speechModel);
                    iocContainer.set(OpenAiModerationModel, moderationModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info(
                        "🤖 OpenAI ChatModel, EmbeddingModel, ImageModel, AudioTranscriptionModel, SpeechModel, ModerationModel, and ChatClient successfully configured",
                    );
                } else {
                    logger.warn("🤖 OpenAI package not found. Please install 'openai' as a dependency.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure OpenAI models:", err);
            }
        }
    }
}
