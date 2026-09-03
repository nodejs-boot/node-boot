import {ResourceCallback} from "./ResourceDefinition";

/**
 * Global, process-wide registry of every `@Resource`-decorated method, keyed by URI.
 *
 * Mirrors `@nodeboot/ai-core`'s `ToolRegistry`, but for MCP resources - a concept with no
 * equivalent in the provider-agnostic `ChatClient`/tool-calling abstraction, so it lives in
 * `@nodeboot/mcp` instead of `@nodeboot/ai-core`.
 */
export class ResourceRegistry {
    private static instance: ResourceRegistry;
    private readonly resources = new Map<string, ResourceCallback>();

    public static get(): ResourceRegistry {
        if (!ResourceRegistry.instance) {
            ResourceRegistry.instance = new ResourceRegistry();
        }
        return ResourceRegistry.instance;
    }

    public register(resource: ResourceCallback): void {
        this.resources.set(resource.definition.uri, resource);
    }

    public getResource(uri: string): ResourceCallback | undefined {
        return this.resources.get(uri);
    }

    public getAllResources(): ResourceCallback[] {
        return Array.from(this.resources.values());
    }

    public clear(): void {
        this.resources.clear();
    }
}
