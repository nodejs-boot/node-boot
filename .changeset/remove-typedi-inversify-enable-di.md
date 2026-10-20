---
"@nodeboot/di": major
"@nodeboot/core": major
---

Dependency injection is now powered by Nonna by default. TypeDI and Inversify remain available as a plugin.

-   Nonna is set up automatically: `@EnableDI(...)` is no longer required, and an application without it uses the Nonna container.
-   `@EnableDI(container)` is kept for plugging in your own container (TypeDI's `Container`, Inversify, ...). `typedi` and `inversify` stay optional dependencies of `@nodeboot/di` and are never required. Beans are only decorated for TypeDI/Inversify once `@EnableDI(...)` is used.
-   A plain constructor parameter with no `@Inject(...)` is only resolved by Nonna if you run the `nonna-compile` build step (see the `@nodeboot/di` README). Otherwise add an explicit `@Inject(...)` to each constructor parameter.
-   In tests, resolve beans with `ApplicationContext.getIocContainer()!.get(...)` from `@nodeboot/context`.
