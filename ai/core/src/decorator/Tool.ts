import {ApplicationContext} from "@nodeboot/context";
import {ToolDecoratorOptions} from "../types";
import {ToolAdapter} from "../adapter";

const registeredToolKeys = new Set<string>();

/**
 * Decorator to register a method as an AI Tool callable by LLMs.
 *
 * @param options Description and schema for the tool
 *
 * @example
 * ```typescript
 * @Service() // Or @Component
 * export class WeatherService {
 *     @Tool({
 *         description: "Get current weather for a location",
 *         inputSchema: {
 *             type: "object",
 *             properties: {
 *                 location: { type: "string", description: "City name" }
 *             },
 *             required: ["location"]
 *         }
 *     })
 *     getWeather(input: { location: string }) {
 *         return { location: input.location, temperature: 22, unit: "celsius" };
 *     }
 * }
 * ```
 */
export function Tool(options: ToolDecoratorOptions | string): MethodDecorator {
    const toolOptions: ToolDecoratorOptions = typeof options === "string" ? {description: options} : options;

    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const key = `${target.constructor.name}::${String(propertyKey)}`;

        if (!registeredToolKeys.has(key)) {
            registeredToolKeys.add(key);

            const adapter = new ToolAdapter({
                target,
                methodName: String(propertyKey),
                methodFunction: descriptor.value,
                toolOptions,
            });

            ApplicationContext.get().applicationFeatureAdapters.push(adapter);
        }
    };
}
