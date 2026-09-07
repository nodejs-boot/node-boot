import {AudioTranscriptionOptions, ImageOptions, ModerationOptions, SpeechOptions} from "@nodeboot/ai-core";
import {OpenAiChatOptions} from "../OpenAiChatOptions";

export interface OpenAiModelConfigProperties {
    apiKey?: string;
    baseURL?: string;
    organization?: string;
    project?: string;
    chat?: {
        options?: OpenAiChatOptions;
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
        speech?: {
            options?: SpeechOptions;
        };
    };
    moderation?: {
        options?: ModerationOptions;
    };
}
