import {decorateDi, DiOptions, Token} from "@node-boot/di";
import {ComponentOptions} from "@node-boot/context";

/**
 * Marks class as a Component that can be injected using the DI Container.
 */
export function Service(): Function;
export function Service(name: string): Function;
export function Service(token: Token<unknown>): Function;
export function Service(config: ComponentOptions): Function;
export function Service(options?: DiOptions): Function {
    return <TFunction extends Function>(target: TFunction) => {
        decorateDi(target, options);
    };
}
