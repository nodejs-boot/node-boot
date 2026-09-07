export interface ModerationOptions {
    model?: string;
    [key: string]: any;
}

export interface ModerationPromptLike {
    getInstructions(): string | string[];
    getOptions?(): ModerationOptions | undefined;
}

export class ModerationPrompt implements ModerationPromptLike {
    private readonly instructions: string | string[];
    private readonly options?: ModerationOptions;

    constructor(instructions: string | string[], options?: ModerationOptions) {
        this.instructions = instructions;
        this.options = options;
    }

    getInstructions(): string | string[] {
        return this.instructions;
    }

    getOptions(): ModerationOptions | undefined {
        return this.options;
    }
}

export interface ModerationResult {
    flagged: boolean;
    categories?: Record<string, boolean>;
    categoryScores?: Record<string, number>;
    metadata?: Record<string, any>;
}

export interface ModerationResponse {
    result: ModerationResult;
    results: ModerationResult[];
    metadata?: {
        id?: string;
        model?: string;
        [key: string]: any;
    };
}

export interface ModerationModel {
    call(prompt: ModerationPromptLike | string): Promise<ModerationResponse>;
    getDefaultOptions?(): ModerationOptions;
}
