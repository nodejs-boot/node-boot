import {Injectable as NonnaInjectable, Scope as NonnaScope, Token as NonnaToken} from "@nonnajs/di";
import {allowedProfiles} from "@nodeboot/context";
import {registerNonnaAlias} from "./defaultContainer";
import {recordPluginDecoration} from "./plugin";
import {DiOptions} from "./types";

/**
 * Registers `target` with Nonna's global decorator registry, unless its `@Profile` excludes it
 * from the active profiles. Returns whether the class was registered.
 *
 * The class is also recorded for the DI plugin selected with `@EnableDI(container)`, if any (see `plugin.ts`).
 */
export function decorateDi<TFunction extends Function>(target: TFunction, options?: DiOptions): boolean {
    if (!allowedProfiles(target)) {
        return false;
    }
    decorateNonna(target, options);
    recordPluginDecoration({kind: "class", target, options});
    return true;
}

/**
 * Registers `target` into Nonna's global decorator registry (the same registry `@Injectable()`/
 * `@Service()` from `@nonnajs/di` write to) so `Injector.refresh()` picks it up under Node-Boot's
 * default container. A string/symbol id given via `options` is recorded as an alias (see
 * `registerNonnaAlias`) rather than the primary token.
 */
function decorateNonna<TFunction extends Function>(target: TFunction, options?: DiOptions): void {
    const {scope, eager, alias} = nonnaOptionsFrom(options);
    NonnaInjectable({scope, eager})(target as unknown as Function);
    if (alias !== undefined) {
        registerNonnaAlias(alias, target);
    }
}

function nonnaOptionsFrom(options?: DiOptions): {scope: NonnaScope; eager: boolean; alias?: NonnaToken} {
    if (options === undefined) {
        return {scope: "singleton", eager: false};
    }
    if (typeof options === "string") {
        return {scope: "singleton", eager: false, alias: options};
    }
    if (typeof options === "object" && options !== null && isComponentOptionsShape(options)) {
        const scope: NonnaScope = options.transient ? "transient" : "singleton";
        const eager = options.eager ?? false;
        const alias = typeof options.id === "string" || typeof options.id === "symbol" ? options.id : undefined;
        return {scope, eager, alias};
    }
    // Unrecognized options: register the class under itself only.
    return {scope: "singleton", eager: false};
}

function isComponentOptionsShape(options: object): options is {
    id?: unknown;
    transient?: boolean;
    eager?: boolean;
} {
    return ["id", "transient", "eager", "global", "multiple", "factory", "value", "type"].some(key => key in options);
}
