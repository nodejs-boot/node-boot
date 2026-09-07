export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    returnDirect?: boolean;
}

export interface ToolContext {
    conversationId?: string;
    metadata?: Record<string, any>;
}

export interface ToolCallback<TInput = any, TOutput = any> {
    readonly definition: ToolDefinition;
    call(input: TInput, context?: ToolContext): Promise<TOutput> | TOutput;
}

export interface ToolCallbackProvider {
    getToolCallbacks(): ToolCallback[];
}

export class FunctionToolCallback<TInput = any, TOutput = any> implements ToolCallback<TInput, TOutput> {
    readonly definition: ToolDefinition;
    private readonly fn: (input: TInput, context?: ToolContext) => Promise<TOutput> | TOutput;

    constructor(definition: ToolDefinition, fn: (input: TInput, context?: ToolContext) => Promise<TOutput> | TOutput) {
        this.definition = definition;
        this.fn = fn;
    }

    call(input: TInput, context?: ToolContext): Promise<TOutput> | TOutput {
        return this.fn(input, context);
    }
}
