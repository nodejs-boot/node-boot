import {ToolCallback} from "./ToolDefinition";

export class ToolRegistry {
    private static instance: ToolRegistry;
    private readonly tools = new Map<string, ToolCallback>();

    public static get(): ToolRegistry {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        return ToolRegistry.instance;
    }

    public register(tool: ToolCallback): void {
        this.tools.set(tool.definition.name, tool);
    }

    public getTool(name: string): ToolCallback | undefined {
        return this.tools.get(name);
    }

    public getAllTools(): ToolCallback[] {
        return Array.from(this.tools.values());
    }

    public clear(): void {
        this.tools.clear();
    }
}
