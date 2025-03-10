import {ComponentOptions, Token} from "@nodeboot/context";
import {decorateDi, DiOptions} from "@nodeboot/di";

/**
 * Marks class as a Component that can be injected using the DI Container.
 */
export function Component(): Function;
export function Component(name: string): Function;
export function Component(token: Token<unknown>): Function;
export function Component(config: ComponentOptions): Function;
export function Component(options?: DiOptions): Function {
    return <TFunction extends Function>(target: TFunction) => {
        decorateDi(target, options);
    };
}
