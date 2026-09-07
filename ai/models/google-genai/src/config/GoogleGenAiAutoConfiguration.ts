import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {GoogleGenAiModelConfigProperties} from "./types";
import {GoogleGenAiChatModel} from "../GoogleGenAiChatModel";
import {GoogleGenAiEmbeddingModel} from "../GoogleGenAiEmbeddingModel";
import {GoogleGenAiImageModel} from "../GoogleGenAiImageModel";

/**
 * Auto-configuration for Google GenAI models in NodeBoot AI.
 */
@Configuration()
export class GoogleGenAiAutoConfiguration {
    @Bean()
    public configureGoogleGenAiModels({logger, config, iocContainer}: BeansContext): void {
        const googleGenAiConfig =
            config.getOptional<GoogleGenAiModelConfigProperties>("ai.google-genai") ??
            config.getOptional<GoogleGenAiModelConfigProperties>("ai.googleGenai");

        if (googleGenAiConfig) {
            try {
                let GoogleGenAIClient: any;
                try {
                    const pkg = require("@google/genai");
                    GoogleGenAIClient = pkg.GoogleGenAI ?? pkg.default?.GoogleGenAI ?? pkg.default;
                } catch {
                    // Fallback to DI container if Google GenAI client was registered elsewhere
                    if (iocContainer.has("GoogleGenAI")) {
                        GoogleGenAIClient = iocContainer.get("GoogleGenAI");
                    }
                }

                if (GoogleGenAIClient) {
                    const clientInstance =
                        typeof GoogleGenAIClient === "function"
                            ? new GoogleGenAIClient({apiKey: googleGenAiConfig.apiKey})
                            : GoogleGenAIClient;

                    const chatModel = new GoogleGenAiChatModel(clientInstance, googleGenAiConfig.chat?.options);
                    const embeddingModel = new GoogleGenAiEmbeddingModel(
                        clientInstance,
                        googleGenAiConfig.embedding?.options,
                    );
                    const imageModel = new GoogleGenAiImageModel(clientInstance, googleGenAiConfig.image?.options);

                    iocContainer.set(GoogleGenAiChatModel, chatModel);
                    iocContainer.set(GoogleGenAiEmbeddingModel, embeddingModel);
                    iocContainer.set(GoogleGenAiImageModel, imageModel);

                    // Also register default ChatClient
                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info(
                        "🤖 Google GenAI ChatModel, EmbeddingModel, ImageModel, and ChatClient successfully configured",
                    );
                } else {
                    logger.warn("🤖 Google GenAI package not found. Please install '@google/genai' as a dependency.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Google GenAI models:", err);
            }
        }
    }
}
