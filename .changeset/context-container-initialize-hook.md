---
"@nodeboot/context": minor
---

`IocContainer` has a new optional `initialize()` hook. Node-Boot calls it once, late in startup, after all `@Configuration`, `@Bean` and `@ConfigurationProperties` registration has run, so containers that validate their dependency graph or eagerly create singletons (such as the default Nonna container) can do so. Containers that don't implement it are unaffected.
