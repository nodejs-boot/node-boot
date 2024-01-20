import {DiOptions} from "./types";

/**
 * Apply dependency injection decorator if dependency injection framework is available
 * */
export function decorateDi<TFunction>(target: TFunction, options?: DiOptions): boolean {
    return decorateTypeDi(target, options) || decorateInversify(target);
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
