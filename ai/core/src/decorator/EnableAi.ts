import {ApplicationContext} from "@nodeboot/context";
import {AI_FEATURE} from "../types";
import {AiConfiguration} from "../config";

export interface EnableAiOptions {
    /**
     * Additional custom tools or options
     */
    tools?: any[];
}

/**
 * Enables Spring AI port capabilities in the NodeBoot application.
 *
 * Activates:
 * - Fluent ChatClient API
 * - PromptTemplates and multimodality
 * - Structured Output Parsers
 * - @Tool decorator discovery
 * - ChatMemory & Advisors (History, RAG, Safety)
 * - Vector Store integrations
 * - MCP (Model Context Protocol) Bridges
 *
 * @example
 * ```typescript
 * @EnableAi()
 * @NodeBootApplication()
 * export class MyApp implements NodeBootApp {
 *     start() {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 */
export const EnableAi = (_options?: EnableAiOptions): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures[AI_FEATURE] = true;
        new AiConfiguration();
    };
};
