import {
    AudioTranscription,
    AudioTranscriptionModel,
    AudioTranscriptionOptions,
    AudioTranscriptionPromptLike,
    AudioTranscriptionResponse,
} from "@nodeboot/ai-core";
import fs from "fs";

export interface AzureOpenAiAudioClientLike {
    audio: {
        transcriptions: {
            create(params: any): Promise<any>;
        };
    };
}

function toFileLike(audio: Buffer | string): any {
    // Node OpenAI SDK accepts fs.ReadStream, Buffer-backed File/Blob or a path via fs.createReadStream
    if (typeof audio === "string") {
        return fs.createReadStream(audio);
    }
    return audio;
}

export class AzureOpenAiAudioTranscriptionModel implements AudioTranscriptionModel {
    private readonly client: AzureOpenAiAudioClientLike;
    private readonly defaultOptions: AudioTranscriptionOptions;

    constructor(client: AzureOpenAiAudioClientLike, defaultOptions?: AudioTranscriptionOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "whisper-1",
            ...defaultOptions,
        };
    }

    getDefaultOptions(): AudioTranscriptionOptions {
        return this.defaultOptions;
    }

    async call(prompt: AudioTranscriptionPromptLike): Promise<AudioTranscriptionResponse> {
        const options: AudioTranscriptionOptions = {...this.defaultOptions, ...prompt.getOptions?.()};

        const response = await this.client.audio.transcriptions.create({
            file: toFileLike(prompt.getAudio()),
            model: options.model,
            language: options.language,
            prompt: options.prompt,
            response_format: options.responseFormat,
            temperature: options.temperature,
        });

        const text = typeof response === "string" ? response : response.text;
        const result: AudioTranscription = {text};

        return {
            result,
            results: [result],
            metadata: {
                model: options.model,
            },
        };
    }
}
