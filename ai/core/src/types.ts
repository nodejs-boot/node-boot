export const AI_FEATURE = "ai.feature";

export interface ToolDecoratorOptions {
    name?: string;
    description: string;
    inputSchema?: Record<string, any>;
    returnDirect?: boolean;
}
