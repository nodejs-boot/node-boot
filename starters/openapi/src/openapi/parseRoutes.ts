import {MetadataArgsStorage} from "@nodeboot/engine";
import {allowedProfiles, ControllerMetadataArgs, NodeBootEngineOptions} from "@nodeboot/context";
import {IRoute} from "../types";

/**
 * Parse Node-Boot controllers metadata into an IRoute objects array.
 */
export function parseRoutes(storage: MetadataArgsStorage, options: NodeBootEngineOptions = {}): IRoute[] {
    return storage.actions
        .filter(action => allowedProfiles(action.target))
        .map(action => ({
            action,
            controller: storage.controllers.find(c => c.target === action.target) as ControllerMetadataArgs,
            options,
            params: storage
                .filterParamsWithTargetAndMethod(action.target, action.method)
                .sort((a, b) => a.index - b.index),
            responseHandlers: storage.filterResponseHandlersWithTargetAndMethod(action.target, action.method),
        }));
}
