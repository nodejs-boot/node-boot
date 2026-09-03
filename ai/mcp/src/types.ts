import {PromptArgumentDefinition} from "./prompt/PromptDefinition";

export const MCP_FEATURE = "mcp.feature";

export interface ResourceDecoratorOptions {
    /** Unique URI identifying this resource, e.g. `"todos://all"` or `"todos://42"`. */
    uri: string;
    /** Resource name shown to MCP clients. Defaults to the decorated method name. */
    name?: string;
    description?: string;
    mimeType?: string;
}

export interface PromptDecoratorOptions {
    /** Prompt name shown to MCP clients. Defaults to the decorated method name. */
    name?: string;
    description?: string;
    arguments?: PromptArgumentDefinition[];
}
