---
"@nodeboot/core": minor
"@nodeboot/di": minor
"@nodeboot/starter-http": patch
---

Apps can now use Nonna's AOT compiler with no per-app configuration.

-   `@nodeboot/core` and `@nodeboot/di` ship a `.nonna.json` that teaches `nonna-compile` about Node-Boot's decorators (`@Component`, `@Service`, `@Controller`, `@Middleware`, `@Interceptor`, `@Inject`). Add `@nonnajs/compiler` as a dev dependency and run `nonna-compile` before the build.
-   `@nodeboot/di` re-exports `defineDependencies`, and the generated file imports it from there, so apps don't need a direct `@nonnajs/di` dependency.
-   `@HttpClient(...)` classes are registered as late-bound tokens, so a service injecting one no longer fails startup validation with "Missing required provider(s)". `@nodeboot/di` is now a runtime dependency of `@nodeboot/starter-http`.
