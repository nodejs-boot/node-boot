import {ApplicationContext} from "@nodeboot/context";
import {PromptDecoratorOptions} from "../types";
import {PromptAdapter} from "../adapter";

const registeredPromptKeys = new Set<string>();

/**
 * Decorator to register a method as an MCP Prompt: a reusable, parameterized message template
 * that any MCP client connected to this application's MCP server (enabled via `@EnableMcp()` +
 * `mcp.server.enabled: true`) can list and expand.
 *
 * Unlike `@Tool` (from `@nodeboot/ai-core`), which is exposed to *any* `ChatClient` regardless of
 * MCP, `@Prompt` is an MCP-only concept and is only served over the MCP protocol.
 *
 * The decorated method receives the prompt's (string-valued, per the MCP spec) arguments and
 * must return either a plain `string` (a shorthand for a single `user` text message) or an array
 * of `PromptMessage`s for multi-turn templates.
 *
 * @param options Prompt name, description and accepted arguments
 *
 * @example
 * ```typescript
 * @Service()
 * export class TodoPromptsService {
 *     @Prompt({
 *         name: "prioritize_todos",
 *         description: "Ask the assistant to prioritize the todo list",
 *         arguments: [{name: "focus", description: "Optional focus area", required: false}],
 *     })
 *     prioritizeTodos(args: {focus?: string}) {
 *         return `Prioritize my todos, focusing on ${args.focus ?? "urgency"}.`;
 *     }
 * }
 * ```
 */
export function Prompt(options: PromptDecoratorOptions = {}): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const key = `${target.constructor.name}::${String(propertyKey)}`;
        if (registeredPromptKeys.has(key)) {
            return;
        }
        registeredPromptKeys.add(key);

        const adapter = new PromptAdapter({
            target,
            methodName: String(propertyKey),
            methodFunction: descriptor.value,
            promptOptions: options,
        });

        ApplicationContext.get().applicationFeatureAdapters.push(adapter);
    };
}
