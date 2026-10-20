---
"@nodeboot/starter-persistence": patch
---

`@DataRepository(...)` classes are now registered as late-bound tokens with the dependency injection container. Repositories are only created after the database connects, so a service injecting one no longer fails the container's startup validation with "Missing required provider(s)". The package now depends on `@nodeboot/di` at runtime for this, and the unused `typedi` dev dependency was removed.
