import {InjectionOptions} from "./types";

/**
 * Applies the `@Inject` decorator of the DI plugin library (TypeDI, then Inversify) that is installed.
 *
 * Only used once a plugin container was selected with `@EnableDI(container)` - see `plugin.ts`. Returns
 * `false`, without side effects, when neither library is installed.
 */
export function decorateInjection(
    target: object,
    propertyName: string | symbol,
    index?: number,
    options?: InjectionOptions,
): boolean {
    return decorateTypeDi(target, propertyName, index, options) || decorateInversify(target, propertyName, index);
}

function decorateTypeDi(
    target: object,
    propertyName: string | symbol,
    index?: number,
    options?: InjectionOptions,
): boolean {
    let inject:
        | ((options?: unknown) => (target: object, propertyName: string | symbol, index?: number) => void)
        | undefined;
    try {
        inject = require("typedi").Inject;
    } catch {
        return false; // TypeDI is not installed
    }
    try {
        inject!(options)(target, propertyName, index);
        return true;
    } catch (error) {
        if ((error as {name?: string}).name === "CannotInjectValueError") {
            throw error;
        }
        return false;
    }
}

function decorateInversify(target: object, propertyName: string | symbol, index?: number): boolean {
    try {
        const {inject} = require("inversify");
        inject(undefined)(target, propertyName, index);
        return true;
    } catch {
        return false; // Inversify is not installed
    }
}
