import {InjectionOptions} from "./types";

/**
 * Apply proper @Inject decorator if dependency injection framework is available
 * */
export function decorateInjection(
    target: Object,
    propertyName: string | Symbol,
    index?: number,
    options?: InjectionOptions,
): boolean {
    return (
        decorateTypeDi(target, propertyName, index, options) ||
        decorateInversify(target, propertyName, index)
    );
}

/**
 * Apply @Inject decorator if TypeDI framework is available
 * */
function decorateTypeDi(
    target: Object,
    propertyName: string | Symbol,
    index?: number,
    options?: InjectionOptions,
): boolean {
    let decorated: boolean;
    try {
        const {Inject} = require("typedi");
        Inject(options)(target, propertyName, index);
        decorated = true;
    } catch (error) {
        if ((error as any).name === "CannotInjectValueError") {
            throw error;
        }

        // TypeDi is not available
        console.warn("@Service decorator is only applied if 'TypeDi' dependency is available!");
        decorated = false;
    }
    return decorated;
}

/**
 * Apply @inject decorator if Inversify framework is available
 * */
function decorateInversify(
    target: Object,
    propertyName: string | Symbol,
    index?: number,
    options?: InjectionOptions,
): boolean {
    let decorated: boolean;
    try {
        const {inject} = require("inversify");
        inject(options)(target, propertyName, index);
        decorated = true;
    } catch (error) {
        // Inversify is not available
        console.warn("@inject decorator is only applied if 'Inversify' dependency is available!");
        decorated = false;
    }
    return decorated;
}
