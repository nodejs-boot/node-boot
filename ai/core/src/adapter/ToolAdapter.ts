import {
    allowedProfiles,
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    getActiveProfiles,
    Lifecycle,
} from "@nodeboot/context";
import {AI_FEATURE} from "../types";
import {FunctionToolCallback, ToolDefinition, ToolRegistry} from "../tool";
import {ToolAdapterOptions} from "./types";

/**
 * ToolAdapter discovers and registers @Tool methods into the ToolRegistry.
 *
 * Runs at the `persistence.started` lifecycle phase (not `application.started`) so that tool
 * beans depending on repositories (e.g. `@DataRepository`-injected services) can be resolved
 * through normal constructor injection. `@nodeboot/starter-persistence` binds repositories
 * asynchronously and only fires `persistence.started` once the `DataSource` is ready and every
 * repository is registered in the IoC container - by binding here instead of the earlier
 * `application.started` event, `iocContainer.get(target.constructor)` below is guaranteed to
 * succeed even for tool beans with repository dependencies, with no need for lazy/manual
 * container lookups in application code. When persistence isn't enabled at all,
 * `ApplicationLifecycleBridge` still fires `persistence.started` right after
 * `application.started`, so non-persistence apps are unaffected.
 */
@Lifecycle("persistence.started")
export class ToolAdapter implements ApplicationFeatureAdapter {
    private readonly options: ToolAdapterOptions;

    constructor(options: ToolAdapterOptions) {
        this.options = options;
    }

    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        const {target, methodName, methodFunction, toolOptions} = this.options;

        if (ApplicationContext.get().applicationFeatures[AI_FEATURE]) {
            if (allowedProfiles(target)) {
                const componentBean = iocContainer.get(target.constructor);
                const toolName = toolOptions.name ?? methodName;

                const definition: ToolDefinition = {
                    name: toolName,
                    description: toolOptions.description,
                    inputSchema: toolOptions.inputSchema ?? {
                        type: "object",
                        properties: {},
                    },
                    returnDirect: toolOptions.returnDirect,
                };

                const toolCallback = new FunctionToolCallback(definition, (input, context) => {
                    return methodFunction.call(componentBean, input, context);
                });

                ToolRegistry.get().register(toolCallback);
                logger.info(`🤖 Registered AI Tool: ${toolName} on ${target.constructor.name}:::${methodName}()`);
            } else {
                logger.warn(
                    `🤖 AI Tool ${
                        target.constructor.name
                    }:::${methodName}() not registered because it is not allowed for active profiles: ${getActiveProfiles()}`,
                );
            }
        } else {
            logger.warn(
                `🤖 AI Tool ${target.constructor.name}:::${methodName}() found but AI feature is disabled. To enable, decorate your NodeBoot application with @EnableAi()`,
            );
        }
    }
}
