export interface AiConfigProperties {
    provider?: "openai" | "anthropic" | "ollama" | "gemini" | string;
    chat?: {
        options?: {
            model?: string;
            temperature?: number;
            topP?: number;
            maxTokens?: number;
        };
    };
    embedding?: {
        options?: {
            model?: string;
            dimensions?: number;
        };
    };
    vectorstore?: {
        type?: "in-memory" | "pgvector" | "pinecone" | "qdrant" | string;
    };
}
