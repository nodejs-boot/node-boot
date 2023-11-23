import {
  Abstract,
  decorateInjection,
  InjectionOptions,
  Newable,
  Token
} from "../ioc";

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
    decorateInjection(target, propertyName, index, options);
  };
}
