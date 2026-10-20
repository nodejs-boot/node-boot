export * from "./decorators";
export * from "./ioc";

// Referenced by the code `nonna-compile` generates (see `.nonna.json`), so applications never need a direct
// `@nonnajs/di` dependency.
export {defineDependencies} from "@nonnajs/di";
