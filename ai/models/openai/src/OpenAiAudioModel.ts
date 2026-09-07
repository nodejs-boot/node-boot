import {
    AudioTranscription,
    AudioTranscriptionModel,
    AudioTranscriptionOptions,
    AudioTranscriptionPromptLike,
    AudioTranscriptionResponse,
    SpeechGeneration,
    SpeechModel,
    SpeechOptions,
    SpeechPromptLike,
    SpeechResponse,
} from "@nodeboot/ai-core";
import fs from "fs";

export interface OpenAiAudioClientLike {
    audio: {
        transcriptions: {
            create(params: any): Promise<any>;
        };
        speech: {
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

export class OpenAiAudioTranscriptionModel implements AudioTranscriptionModel {
    private readonly client: OpenAiAudioClientLike;
    private readonly defaultOptions: AudioTranscriptionOptions;

    constructor(client: OpenAiAudioClientLike, defaultOptions?: AudioTranscriptionOptions) {
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

export class OpenAiSpeechModel implements SpeechModel {
    private readonly client: OpenAiAudioClientLike;
    private readonly defaultOptions: SpeechOptions;

    constructor(client: OpenAiAudioClientLike, defaultOptions?: SpeechOptions) {
        this.client = client;
        this.defaultOptions = {
            model: "tts-1",
            voice: "alloy",
            responseFormat: "mp3",
            ...defaultOptions,
        };
    }

    getDefaultOptions(): SpeechOptions {
        return this.defaultOptions;
    }

    async call(prompt: SpeechPromptLike | string): Promise<SpeechResponse> {
        const text = typeof prompt === "string" ? prompt : prompt.getInstructions();
        const promptOptions = typeof prompt === "string" ? undefined : prompt.getOptions?.();
        const options: SpeechOptions = {...this.defaultOptions, ...promptOptions};

        const response = await this.client.audio.speech.create({
            model: options.model,
            voice: options.voice,
            input: text,
            response_format: options.responseFormat,
            speed: options.speed,
        });

        // openai SDK returns a Response-like object exposing arrayBuffer()
        const arrayBuffer = typeof response.arrayBuffer === "function" ? await response.arrayBuffer() : response;
        const audio = Buffer.isBuffer(arrayBuffer) ? arrayBuffer : Buffer.from(arrayBuffer);

        const generation: SpeechGeneration = {audio};

        return {
            result: generation,
            metadata: {
                model: options.model,
            },
        };
    }
}
