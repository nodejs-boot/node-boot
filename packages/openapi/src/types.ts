import {
    ActionMetadataArgs,
    ControllerMetadataArgs,
    NodeBootEngineOptions,
    ParamMetadataArgs,
    ResponseHandlerMetadataArgs,
} from "@node-boot/context";

/**
 * All the context for a single route.
 */
export interface IRoute {
    readonly action: ActionMetadataArgs;
    readonly controller: ControllerMetadataArgs;
    readonly options: NodeBootEngineOptions;
    readonly params: ParamMetadataArgs[];
    readonly responseHandlers: ResponseHandlerMetadataArgs[];
}
