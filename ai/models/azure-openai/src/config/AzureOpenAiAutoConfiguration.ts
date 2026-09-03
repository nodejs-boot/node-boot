import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ChatClient} from "@nodeboot/ai-core";
import {AzureOpenAiModelConfigProperties} from "./types";
import {AzureOpenAiChatModel} from "../AzureOpenAiChatModel";
import {AzureOpenAiEmbeddingModel} from "../AzureOpenAiEmbeddingModel";
import {AzureOpenAiImageModel} from "../AzureOpenAiImageModel";
import {AzureOpenAiAudioTranscriptionModel} from "../AzureOpenAiAudioTranscriptionModel";

/**
 * Auto-configuration for Azure OpenAI models in NodeBoot AI.
 */
@Configuration()
export class AzureOpenAiAutoConfiguration {
    @Bean()
    public configureAzureOpenAiModels({logger, config, iocContainer}: BeansContext): void {
        const azureOpenAiConfig =
            config.getOptional<AzureOpenAiModelConfigProperties>("ai.azure-openai") ??
            config.getOptional<AzureOpenAiModelConfigProperties>("ai.azureOpenai");

        if (azureOpenAiConfig) {
            try {
                let OpenAIPackage: any;
                try {
                    OpenAIPackage = require("openai");
                    if (OpenAIPackage.default) {
                        OpenAIPackage = {
                            ...OpenAIPackage,
                            AzureOpenAI: OpenAIPackage.AzureOpenAI ?? OpenAIPackage.default.AzureOpenAI,
                        };
                    }
                } catch {
                    // Fallback to DI container if AzureOpenAI client was registered elsewhere
                    if (iocContainer.has("AzureOpenAI")) {
                        OpenAIPackage = {
                            AzureOpenAI: iocContainer.get("AzureOpenAI"),
                        };
                    }
                }

                const AzureOpenAIClient = OpenAIPackage?.AzureOpenAI;

                if (AzureOpenAIClient) {
                    const clientInstance =
                        typeof AzureOpenAIClient === "function"
                            ? new AzureOpenAIClient({
                                  apiKey: azureOpenAiConfig.apiKey,
                                  endpoint: azureOpenAiConfig.endpoint,
                                  apiVersion: azureOpenAiConfig.apiVersion,
                                  deployment: azureOpenAiConfig.deploymentName,
                              })
                            : AzureOpenAIClient;

                    const chatModel = new AzureOpenAiChatModel(clientInstance, azureOpenAiConfig.chat?.options);
                    const embeddingModel = new AzureOpenAiEmbeddingModel(
                        clientInstance,
                        azureOpenAiConfig.embedding?.options,
                    );
                    const imageModel = new AzureOpenAiImageModel(clientInstance, azureOpenAiConfig.image?.options);
                    const audioTranscriptionModel = new AzureOpenAiAudioTranscriptionModel(
                        clientInstance,
                        azureOpenAiConfig.audio?.transcription?.options,
                    );

                    iocContainer.set(AzureOpenAiChatModel, chatModel);
                    iocContainer.set(AzureOpenAiEmbeddingModel, embeddingModel);
                    iocContainer.set(AzureOpenAiImageModel, imageModel);
                    iocContainer.set(AzureOpenAiAudioTranscriptionModel, audioTranscriptionModel);

                    const chatClient = ChatClient.create(chatModel);
                    iocContainer.set(ChatClient, chatClient);

                    logger.info(
                        "🤖 Azure OpenAI ChatModel, EmbeddingModel, ImageModel, AudioTranscriptionModel, and ChatClient successfully configured",
                    );
                } else {
                    logger.warn("🤖 OpenAI package not found. Please install 'openai' as a dependency.");
                }
            } catch (err: any) {
                logger.error("🤖 Failed to auto-configure Azure OpenAI models:", err);
            }
        }
    }
}
