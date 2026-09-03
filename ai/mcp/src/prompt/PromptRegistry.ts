import {PromptCallback} from "./PromptDefinition";

/**
 * Global, process-wide registry of every `@Prompt`-decorated method, keyed by prompt name.
 *
 * Mirrors `@nodeboot/ai-core`'s `ToolRegistry`, but for MCP prompts - a concept with no
 * equivalent in the provider-agnostic `ChatClient`/tool-calling abstraction, so it lives in
 * `@nodeboot/mcp` instead of `@nodeboot/ai-core`.
 */
export class PromptRegistry {
    private static instance: PromptRegistry;
    private readonly prompts = new Map<string, PromptCallback>();

    public static get(): PromptRegistry {
        if (!PromptRegistry.instance) {
            PromptRegistry.instance = new PromptRegistry();
        }
        return PromptRegistry.instance;
    }

    public register(prompt: PromptCallback): void {
        this.prompts.set(prompt.definition.name, prompt);
    }

    public getPrompt(name: string): PromptCallback | undefined {
        return this.prompts.get(name);
    }

    public getAllPrompts(): PromptCallback[] {
        return Array.from(this.prompts.values());
    }

    public clear(): void {
        this.prompts.clear();
    }
}
