import {Injector, Token as NonnaToken} from "@nonnajs/di";
import {DependencyInjectionOptions} from "@nodeboot/context";
import {NonnaContainerAdapter} from "./NonnaContainerAdapter";

/**
 * `(alias, target)` pairs recorded by `decorateDi()` when a component is given a custom
 * string/symbol id (e.g. `@Component("my-name")`), so the default Nonna container can also
 * resolve them by that id, aliased to the same class registration.
 *
 * Global by design: components are decorated at module-import time, well before any
 * `createDefaultDiOptions()` call, so every alias recorded anywhere in the process is available
 * to whichever default container ends up being created.
 */
const nonnaAliases: Array<[NonnaToken, Function]> = [];

export function registerNonnaAlias(alias: NonnaToken, target: Function): void {
    nonnaAliases.push([alias, target]);
}

function getNonnaAliases(): ReadonlyArray<readonly [NonnaToken, Function]> {
    return nonnaAliases;
}

/**
 * Tokens whose instances are created and bound (`iocContainer.set(...)`) only after the container
 * has been initialized, e.g. persistence repositories, which exist once the database connects.
 * Nonna validates the dependency graph at `initialize()`, so a class injecting one of these would
 * otherwise be rejected as having a missing provider. Global for the same reason as the aliases.
 */
const lateBoundTokens: Function[] = [];

export function registerLateBoundToken(token: Function): void {
    lateBoundTokens.push(token);
}

function getLateBoundTokens(): ReadonlyArray<Function> {
    return lateBoundTokens;
}

/**
 * Builds a fresh Nonna-backed `DependencyInjectionOptions` - Node-Boot's IoC container.
 */
export function createDefaultDiOptions(): DependencyInjectionOptions {
    const adapter = new NonnaContainerAdapter(Injector.create(), getNonnaAliases, getLateBoundTokens);
    adapter.refresh();
    return {iocContainer: adapter};
}
