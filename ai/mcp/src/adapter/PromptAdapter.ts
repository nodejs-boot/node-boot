import {
    allowedProfiles,
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    getActiveProfiles,
    Lifecycle,
} from "@nodeboot/context";
import {MCP_FEATURE, PromptDecoratorOptions} from "../types";
import {FunctionPromptCallback, PromptDefinition, PromptRegistry} from "../prompt";

export interface PromptAdapterOptions {
    target: any;
    methodName: string;
    methodFunction: Function;
    promptOptions: PromptDecoratorOptions;
}

/**
 * PromptAdapter discovers and registers @Prompt methods into the PromptRegistry.
 *
 * Runs at the `persistence.started` lifecycle phase - same as `@nodeboot/ai-core`'s `ToolAdapter`
 * - so that prompt beans depending on repositories can be resolved through normal constructor
 * injection, since `@nodeboot/starter-persistence` only fires `persistence.started` once every
 * repository is bound in the IoC container.
 */
@Lifecycle("persistence.started")
export class PromptAdapter implements ApplicationFeatureAdapter {
    private readonly options: PromptAdapterOptions;

    constructor(options: PromptAdapterOptions) {
        this.options = options;
    }

    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        const {target, methodName, methodFunction, promptOptions} = this.options;

        if (ApplicationContext.get().applicationFeatures[MCP_FEATURE]) {
            if (allowedProfiles(target)) {
                const componentBean = iocContainer.get(target.constructor);
                const promptName = promptOptions.name ?? methodName;

                const definition: PromptDefinition = {
                    name: promptName,
                    description: promptOptions.description,
                    arguments: promptOptions.arguments,
                };

                const promptCallback = new FunctionPromptCallback(definition, args => {
                    return methodFunction.call(componentBean, args);
                });

                PromptRegistry.get().register(promptCallback);
                logger.info(`📝 Registered MCP Prompt: ${promptName} on ${target.constructor.name}:::${methodName}()`);
            } else {
                logger.warn(
                    `📝 MCP Prompt ${
                        target.constructor.name
                    }:::${methodName}() not registered because it is not allowed for active profiles: ${getActiveProfiles()}`,
                );
            }
        } else {
            logger.warn(
                `📝 MCP Prompt ${target.constructor.name}:::${methodName}() found but MCP feature is disabled. To enable, decorate your NodeBoot application with @EnableMcp()`,
            );
        }
    }
}
