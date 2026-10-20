import {Injector, Token as NonnaToken} from "@nonnajs/di";
import {Action, ClassConstructor, IocContainer} from "@nodeboot/context";

/**
 * Adapts a Nonna `Injector` to Node-Boot's `IocContainer` abstraction, so Nonna can serve as
 * Node-Boot's IoC container.
 *
 * `aliases` is a lazily-read list of `(alias token, target class)` pairs - see
 * `registerNonnaAlias()` in `defaultContainer.ts` - applied as Nonna `useExisting` providers so
 * named/string/symbol component ids (e.g. `@Component("my-name")`) resolve to the same instance
 * as the class itself.
 */
export class NonnaContainerAdapter implements IocContainer<Injector> {
    private injector: Injector;

    constructor(
        injector: Injector = Injector.create(),
        private readonly aliases: () => ReadonlyArray<readonly [NonnaToken, Function]> = () => [],
        private readonly lateBoundTokens: () => ReadonlyArray<Function> = () => [],
    ) {
        this.injector = injector;
    }

    get<T>(someClass: ClassConstructor<T> | string, _action?: Action): T {
        return this.injector.get(someClass as NonnaToken<T>);
    }

    set(type: Function | string, value: unknown): Injector {
        this.injector.register({provide: type as NonnaToken, useValue: value});
        return this.injector;
    }

    has(type: Function | string): boolean {
        return this.injector.has(type as NonnaToken);
    }

    /**
     * Nonna has no native reset - this swaps in a brand new `Injector` instead. Not called from
     * any Node-Boot production path today (only ever exercised by tests resetting container
     * state between runs).
     */
    reset(): void {
        this.injector = Injector.create();
        this.refresh();
    }

    /**
     * Pulls decorator-registered classes (`@Component`/`@Service`/`@Controller`/`@Middleware`/
     * `@Interceptor`) into this injector and (re)applies the alias list. Safe to call repeatedly.
     */
    refresh(): void {
        this.injector.refresh();
        this.applyAliases();
        this.applyLateBoundTokens();
    }

    /**
     * The `IocContainer.initialize?()` hook `BaseServer` calls once, late in bootstrap: validates
     * the dependency graph and eagerly instantiates `eager: true` singletons.
     */
    async initialize(): Promise<void> {
        this.refresh();
        await this.injector.initialize();
    }

    /** Escape hatch for advanced use (e.g. `runInScope()` for request-scoped providers). */
    getInjector(): Injector {
        return this.injector;
    }

    /**
     * Registers a placeholder for each late-bound token so graph validation at `initialize()`
     * passes; the real value replaces it via `set()` once it exists. Resolving the placeholder
     * earlier than that fails with a clear error.
     */
    private applyLateBoundTokens(): void {
        for (const token of this.lateBoundTokens()) {
            if (this.injector.has(token as NonnaToken)) continue;
            this.injector.register({
                provide: token as NonnaToken,
                useFactory: () => {
                    throw new Error(`'${token.name}' is bound after startup and is not available yet.`);
                },
            });
        }
    }

    private applyAliases(): void {
        for (const [alias, target] of this.aliases()) {
            if (!this.injector.has(target as NonnaToken)) continue;
            this.injector.register({provide: alias, useExisting: target as NonnaToken});
        }
    }
}
