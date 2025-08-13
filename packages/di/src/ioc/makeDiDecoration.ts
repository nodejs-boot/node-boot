import {DiOptions} from "./types";
import {allowedProfiles} from "@nodeboot/context";

/**
 * Apply dependency injection decorator if dependency injection framework is available
 * */
export function decorateDi<TFunction>(target: TFunction, options?: DiOptions): boolean {
    // Check if the target class is allowed to be decorated based on active profiles
    if (allowedProfiles(target)) {
        // Try to apply TypeDI decorator first, if it fails, fallback to Inversify
        // This allows for flexibility in using either framework based on availability
        // and ensures that the decorator is applied correctly.
        return decorateTypeDi(target, options) || decorateInversify(target);
    }
    return false;
}

/**
 * Apply @Service decorator if TypeDI framework is available
 * */
function decorateTypeDi<TFunction>(target: TFunction, options?: DiOptions): boolean {
    let decorated: boolean;
    try {
        const {Service} = require("typedi");
        Service(options)(target);
        decorated = true;
    } catch (error) {
        // TypeDi is not available
        console.warn("@Service decorator is only applied if 'TypeDi' dependency is available!");
        decorated = false;
    }
    return decorated;
}

/**
 * Apply @injectable decorator if Inversify framework is available
 * */
function decorateInversify<TFunction>(target: TFunction): boolean {
    let decorated: boolean;
    try {
        const {injectable} = require("inversify");
        injectable()(target);
        decorated = true;
    } catch (error) {
        // Inversify is not available
        console.warn("'Inversify' dependency is not available! Please install it first");
        decorated = false;
    }
    return decorated;
}
