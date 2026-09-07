import {ImageOptions} from "@nodeboot/ai-core";
import {GoogleGenAiChatOptions} from "../GoogleGenAiChatOptions";

export interface GoogleGenAiModelConfigProperties {
    apiKey?: string;
    project?: string;
    location?: string;
    chat?: {
        options?: GoogleGenAiChatOptions;
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
}
