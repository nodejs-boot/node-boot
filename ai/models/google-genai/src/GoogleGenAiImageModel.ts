import {ImageGeneration, ImageModel, ImageOptions, ImagePromptLike, ImageResponse} from "@nodeboot/ai-core";

export interface GoogleGenAiImageClientLike {
    models: {
        generateImages(params: any): Promise<any>;
    };
}

export class GoogleGenAiImageModel implements ImageModel {
    private readonly client: GoogleGenAiImageClientLike;
    private readonly defaultOptions: ImageOptions;

    constructor(client: GoogleGenAiImageClientLike, defaultOptions?: ImageOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "imagen-3.0-generate-002",
            n: 1,
            ...defaultOptions,
        };
    }

    getDefaultOptions(): ImageOptions {
        return this.defaultOptions;
    }

    async call(prompt: ImagePromptLike | string): Promise<ImageResponse> {
        const promptText = typeof prompt === "string" ? prompt : prompt.getInstructions();
        const promptOptions = typeof prompt === "string" ? undefined : prompt.getOptions?.();
        const options: ImageOptions = {...this.defaultOptions, ...promptOptions};

        const response = await this.client.models.generateImages({
            model: options.model ?? "imagen-3.0-generate-002",
            prompt: promptText,
            config: {
                numberOfImages: options.n ?? 1,
            },
        });

        const results: ImageGeneration[] = (response.generatedImages ?? []).map((item: any) => ({
            image: {
                b64Json: item.image?.imageBytes,
            },
        }));

        return {
            result: results[0] ?? {image: {}},
            results,
            metadata: {
                model: options.model,
            },
        };
    }
}
