import {ApplicationContext} from "@nodeboot/context";
import {ResourceDecoratorOptions} from "../types";
import {ResourceAdapter} from "../adapter";

const registeredResourceKeys = new Set<string>();

/**
 * Decorator to register a method as an MCP Resource, readable by URI by any MCP client
 * connected to this application's MCP server (enabled via `@EnableMcp()` +
 * `mcp.server.enabled: true`).
 *
 * Unlike `@Tool` (from `@nodeboot/ai-core`), which is exposed to *any* `ChatClient` regardless of
 * MCP, `@Resource` is an MCP-only concept and is only served over the MCP protocol.
 *
 * @param options Resource URI, name, description and MIME type
 *
 * @example
 * ```typescript
 * @Service()
 * export class TodoResourcesService {
 *     constructor(private readonly todoService: TodoService) {}
 *
 *     @Resource({
 *         uri: "todos://all",
 *         description: "All todo items in the knowledge base, as JSON",
 *         mimeType: "application/json",
 *     })
 *     async allTodos() {
 *         return JSON.stringify(await this.todoService.list());
 *     }
 * }
 * ```
 */
export function Resource(options: ResourceDecoratorOptions): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const key = `${target.constructor.name}::${String(propertyKey)}`;
        // Register only if not registered already
        if (!registeredResourceKeys.has(key)) {
            registeredResourceKeys.add(key);

            const adapter = new ResourceAdapter({
                target,
                methodName: String(propertyKey),
                methodFunction: descriptor.value,
                resourceOptions: options,
            });

            ApplicationContext.get().applicationFeatureAdapters.push(adapter);
        }
    };
}
