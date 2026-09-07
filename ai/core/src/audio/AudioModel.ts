export interface AudioTranscriptionOptions {
    model?: string;
    language?: string;
    prompt?: string;
    responseFormat?: "json" | "text" | "srt" | "verbose_json" | "vtt";
    temperature?: number;
    [key: string]: any;
}

export interface AudioTranscriptionPromptLike {
    /** Raw audio bytes, a local file path, or a remote URL */
    getAudio(): Buffer | string;
    getOptions?(): AudioTranscriptionOptions | undefined;
}

export class AudioTranscriptionPrompt implements AudioTranscriptionPromptLike {
    private readonly audio: Buffer | string;
    private readonly options?: AudioTranscriptionOptions;

    constructor(audio: Buffer | string, options?: AudioTranscriptionOptions) {
        this.audio = audio;
        this.options = options;
    }

    getAudio(): Buffer | string {
        return this.audio;
    }

    getOptions(): AudioTranscriptionOptions | undefined {
        return this.options;
    }
}

export interface AudioTranscription {
    text: string;
    metadata?: Record<string, any>;
}

export interface AudioTranscriptionResponse {
    result: AudioTranscription;
    results?: AudioTranscription[];
    metadata?: Record<string, any>;
}

export interface AudioTranscriptionModel {
    call(prompt: AudioTranscriptionPromptLike): Promise<AudioTranscriptionResponse>;
    getDefaultOptions?(): AudioTranscriptionOptions;
}

export interface SpeechOptions {
    model?: string;
    voice?: string;
    responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
    speed?: number;
    [key: string]: any;
}

export interface SpeechPromptLike {
    getInstructions(): string;
    getOptions?(): SpeechOptions | undefined;
}

export class SpeechPrompt implements SpeechPromptLike {
    private readonly text: string;
    private readonly options?: SpeechOptions;

    constructor(text: string, options?: SpeechOptions) {
        this.text = text;
        this.options = options;
    }

    getInstructions(): string {
        return this.text;
    }

    getOptions(): SpeechOptions | undefined {
        return this.options;
    }
}

export interface SpeechGeneration {
    audio: Buffer;
    metadata?: Record<string, any>;
}

export interface SpeechResponse {
    result: SpeechGeneration;
    metadata?: Record<string, any>;
}

/**
 * Text-To-Speech (TTS) model.
 */
export interface SpeechModel {
    call(prompt: SpeechPromptLike | string): Promise<SpeechResponse>;
    getDefaultOptions?(): SpeechOptions;
}
