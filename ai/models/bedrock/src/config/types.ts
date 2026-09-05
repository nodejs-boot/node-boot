import {BedrockChatOptions} from "../BedrockChatOptions";

export interface BedrockModelConfigProperties {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    chat?: {
        options?: BedrockChatOptions;
    };
    embedding?: {
        options?: {
            model?: string;
            provider?: "titan" | "cohere";
            dimensions?: number;
        };
    };
}
