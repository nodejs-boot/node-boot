---
"@nodeboot/starter-persistence": patch
---

`@nodeboot/starter-persistence` now ships a `.nonna.json`, so `nonna-compile` treats classes decorated with `@PersistenceCache()` as injectable and infers their constructor dependencies. Without it, a `@PersistenceCache()` class with constructor parameters failed with "unresolved constructor dependencies" unless every parameter had an explicit `@Inject(...)`.
