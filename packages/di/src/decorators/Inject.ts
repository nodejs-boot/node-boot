import {Abstract, decorateInjection, InjectionOptions, Newable} from "../ioc";
import {Token} from "typedi";

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
    return (target: Object, propertyName: string | Symbol, index?: number) => {
        // Registering metadata for custom filed injection (used for example in the Persistence Event Subscribers)
        if (propertyName && typeof propertyName === "string") {
            const injectProperties: string[] = Reflect.getMetadata(REQUIRES_FIELD_INJECTION_KEY, target) || [];
            injectProperties.push(propertyName);
            Reflect.defineMetadata(REQUIRES_FIELD_INJECTION_KEY, injectProperties, target);
        }
        // Normal injection
        decorateInjection(target, propertyName, index, options);
    };
}
