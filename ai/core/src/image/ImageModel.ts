export interface ImageOptions {
    model?: string;
    n?: number;
    width?: number;
    height?: number;
    /** Provider-specific size string, e.g. "1024x1024" */
    size?: string;
    quality?: string;
    style?: string;
    responseFormat?: "url" | "b64_json";
    [key: string]: any;
}

export interface ImagePromptLike {
    getInstructions(): string;
    getOptions?(): ImageOptions | undefined;
}

export class ImagePrompt implements ImagePromptLike {
    private readonly prompt: string;
    private readonly options?: ImageOptions;

    constructor(prompt: string, options?: ImageOptions) {
        this.prompt = prompt;
        this.options = options;
    }

    getInstructions(): string {
        return this.prompt;
    }

    getOptions(): ImageOptions | undefined {
        return this.options;
    }
}

export interface ImageGeneration {
    image: {
        url?: string;
        b64Json?: string;
    };
    metadata?: Record<string, any>;
}

export interface ImageResponseMetadata {
    model?: string;
    created?: number;
    [key: string]: any;
}

export interface ImageResponse {
    result: ImageGeneration;
    results: ImageGeneration[];
    metadata?: ImageResponseMetadata;
}

export interface ImageModel {
    call(prompt: ImagePromptLike | string): Promise<ImageResponse>;
    getDefaultOptions?(): ImageOptions;
}
