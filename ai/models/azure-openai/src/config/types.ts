import {AudioTranscriptionOptions, ImageOptions} from "@nodeboot/ai-core";
import {AzureOpenAiChatOptions} from "../AzureOpenAiChatOptions";

export interface AzureOpenAiModelConfigProperties {
    apiKey?: string;
    endpoint?: string;
    apiVersion?: string;
    deploymentName?: string;
    chat?: {
        options?: AzureOpenAiChatOptions;
    };
    embedding?: {
        options?: {
            model?: string;
            dimensions?: number;
        };
    };
    image?: {
        options?: ImageOptions;
    };
    audio?: {
        transcription?: {
            options?: AudioTranscriptionOptions;
        };
    };
}
