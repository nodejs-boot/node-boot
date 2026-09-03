/** A single named argument a prompt template accepts. */
export interface PromptArgumentDefinition {
    name: string;
    description?: string;
    required?: boolean;
}

/**
 * Describes a Model Context Protocol prompt: a reusable, parameterized message template that an
 * MCP client can list (`prompts/list`) and expand into concrete chat messages (`prompts/get`).
 *
 * @see https://modelcontextprotocol.io/docs/concepts/prompts
 */
export interface PromptDefinition {
    name: string;
    description?: string;
    arguments?: PromptArgumentDefinition[];
}

/** A single rendered chat message returned by a prompt. */
export interface PromptMessage {
    role: "user" | "assistant";
    content: {type: "text"; text: string} | {type: "image"; data: string; mimeType: string};
}

export interface PromptCallback {
    readonly definition: PromptDefinition;
    /**
     * Renders the prompt for the given (string-valued, per the MCP spec) arguments.
     *
     * Returning a plain `string` is a convenience shorthand for a single `user` text message.
     */
    render(args: Record<string, string>): Promise<PromptMessage[] | string> | PromptMessage[] | string;
}

/**
 * Adapts a plain function into a `PromptCallback`, mirroring `FunctionToolCallback` from
 * `@nodeboot/ai-core`.
 */
export class FunctionPromptCallback implements PromptCallback {
    readonly definition: PromptDefinition;
    private readonly fn: (args: Record<string, string>) => Promise<PromptMessage[] | string> | PromptMessage[] | string;

    constructor(
        definition: PromptDefinition,
        fn: (args: Record<string, string>) => Promise<PromptMessage[] | string> | PromptMessage[] | string,
    ) {
        this.definition = definition;
        this.fn = fn;
    }

    render(args: Record<string, string>): Promise<PromptMessage[] | string> | PromptMessage[] | string {
        return this.fn(args);
    }
}
