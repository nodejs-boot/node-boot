import {
    allowedProfiles,
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    getActiveProfiles,
    Lifecycle,
} from "@nodeboot/context";
import {MCP_FEATURE, ResourceDecoratorOptions} from "../types";
import {FunctionResourceCallback, ResourceDefinition, ResourceRegistry} from "../resource";

export interface ResourceAdapterOptions {
    target: any;
    methodName: string;
    methodFunction: Function;
    resourceOptions: ResourceDecoratorOptions;
}

/**
 * ResourceAdapter discovers and registers @Resource methods into the ResourceRegistry.
 *
 * Runs at the `persistence.started` lifecycle phase - same as `@nodeboot/ai-core`'s `ToolAdapter`
 * - so that resource beans depending on repositories can be resolved through normal constructor
 * injection, since `@nodeboot/starter-persistence` only fires `persistence.started` once every
 * repository is bound in the IoC container.
 */
@Lifecycle("persistence.started")
export class ResourceAdapter implements ApplicationFeatureAdapter {
    private readonly options: ResourceAdapterOptions;

    constructor(options: ResourceAdapterOptions) {
        this.options = options;
    }

    bind({logger, iocContainer}: ApplicationFeatureContext): void {
        const {target, methodName, methodFunction, resourceOptions} = this.options;

        if (ApplicationContext.get().applicationFeatures[MCP_FEATURE]) {
            if (allowedProfiles(target)) {
                const componentBean = iocContainer.get(target.constructor);

                const definition: ResourceDefinition = {
                    uri: resourceOptions.uri,
                    name: resourceOptions.name ?? methodName,
                    description: resourceOptions.description,
                    mimeType: resourceOptions.mimeType,
                };

                const resourceCallback = new FunctionResourceCallback(definition, uri => {
                    return methodFunction.call(componentBean, uri);
                });

                ResourceRegistry.get().register(resourceCallback);
                logger.info(
                    `📄 Registered MCP Resource: ${definition.uri} on ${target.constructor.name}:::${methodName}()`,
                );
            } else {
                logger.warn(
                    `📄 MCP Resource ${
                        target.constructor.name
                    }:::${methodName}() not registered because it is not allowed for active profiles: ${getActiveProfiles()}`,
                );
            }
        } else {
            logger.warn(
                `📄 MCP Resource ${target.constructor.name}:::${methodName}() found but MCP feature is disabled. To enable, decorate your NodeBoot application with @EnableMcp()`,
            );
        }
    }
}
