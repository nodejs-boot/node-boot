import {Abstract, InjectionOptions, Newable, recordPluginDecoration} from "../ioc";
import {Token} from "@nodeboot/context";
import {
    Constructor as NonnaConstructor,
    recordFieldDependency,
    recordParamDependency,
    Token as NonnaToken,
} from "@nonnajs/di";

export const REQUIRES_FIELD_INJECTION_KEY = "custom:requiresFieldInjection";

/**
 * Injects a service/component into a class property or constructor parameter.
 */
export function Inject(): Function;
export function Inject(typeFn: Newable<unknown>): Function;
export function Inject(abstractType: Abstract<unknown>): Function;
export function Inject(serviceName?: string): Function;
export function Inject(symbolValue?: symbol): Function;
export function Inject(token: Token<unknown>): Function;
export function Inject(options?: InjectionOptions): Function {
    return (target: object, propertyName: string | symbol, index?: number) => {
        // Registering metadata for custom filed injection (used for example in the Persistence Event Subscribers)
        if (propertyName && typeof propertyName === "string") {
            const injectProperties: string[] = Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, target) || [];
            injectProperties.push(propertyName);
            Reflect.defineMetadata(REQUIRES_FIELD_INJECTION_KEY, injectProperties, target);
        }
        // Wire `@Inject(token)` into whichever shape TypeScript invoked the decorator with
        // (constructor parameter or class field).
        if (index !== undefined && !propertyName) {
            recordNonnaParamDependency(target as Function, index, options);
        } else if (propertyName && index === undefined) {
            recordNonnaFieldDependency(target, propertyName, options);
        }
        // Also decorate for the DI plugin selected with `@EnableDI(container)`, if any.
        recordPluginDecoration({kind: "inject", target, propertyName, index, options});
    };
}

/**
 * A bare `@Inject()` (no token) reads `design:paramtypes` for concrete-class params.
 */
function recordNonnaParamDependency(target: Function, index: number, options?: InjectionOptions): void {
    const token = nonnaTokenFrom(target, index, options);
    if (token === undefined) return;
    recordParamDependency(target as unknown as NonnaConstructor, index, {token, optional: false});
}

function nonnaTokenFrom(target: Function, index: number, options?: InjectionOptions): NonnaToken | undefined {
    if (options === undefined) {
        const paramTypes: unknown[] = Reflect.getMetadata("design:paramtypes", target) ?? [];
        return paramTypes[index] as NonnaToken | undefined;
    }
    if (typeof options === "function") {
        return options as unknown as NonnaToken;
    }
    if (typeof options === "string" || typeof options === "symbol") {
        return options;
    }
    return undefined;
}

/**
 * Mirrors {@link recordNonnaParamDependency} for a class field: `target` here is the class
 * *prototype* (as TypeScript always passes for an instance property decorator), so the class
 * itself is read off `target.constructor` before recording the field dependency with Nonna.
 */
function recordNonnaFieldDependency(target: object, propertyName: string | symbol, options?: InjectionOptions): void {
    const token = nonnaFieldTokenFrom(target, propertyName, options);
    if (token === undefined) return;
    const ctor = (target as {constructor: Function}).constructor as unknown as NonnaConstructor;
    recordFieldDependency(ctor, propertyName, {token, optional: false});
}

function nonnaFieldTokenFrom(
    target: object,
    propertyName: string | symbol,
    options?: InjectionOptions,
): NonnaToken | undefined {
    if (options === undefined) {
        // Bare @Inject() on a field: read `design:type` (populated by `emitDecoratorMetadata`),
        // the same reflect-metadata bridge already used for a bare @Inject() constructor
        // parameter above - Nonna's own AOT compiler has no field-level inference to fall back on.
        const propertyType: unknown = Reflect.getMetadata("design:type", target, propertyName);
        return propertyType as NonnaToken | undefined;
    }
    if (typeof options === "function") {
        return options as unknown as NonnaToken;
    }
    if (typeof options === "string" || typeof options === "symbol") {
        return options;
    }
    return undefined;
}
