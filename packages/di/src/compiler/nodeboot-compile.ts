#!/usr/bin/env node

import path from "node:path";
import {compile, formatDiagnostics} from "@nonnajs/compiler";

/**
 * Node-Boot's own class-level and parameter-level decorators, pre-registered as additional
 * `@nonnajs/compiler` decorator sources alongside the raw `@Injectable`/`@Service`/`@Inject` from
 * `@nonnajs/di`, so `nonna-compile`'s AOT dependency graph also understands
 * `@Component`/`@Service`/`@Controller`/`@Middleware`/`@Interceptor`/`@Inject` written against
 * `@nodeboot/core`/`@nodeboot/di` directly - no need for apps to configure the raw compiler.
 */
const NODE_BOOT_CLASS_DECORATORS = ["Component", "Service", "Controller", "Middleware", "Interceptor"].map(
    exportName => ({moduleSpecifier: "@nodeboot/core", exportName}),
);
const NODE_BOOT_INJECT_DECORATORS = [{moduleSpecifier: "@nodeboot/di", exportName: "Inject"}];

function parseArgs(argv: readonly string[]): {project: string; outputFile: string} {
    let project = "tsconfig.json";
    let outputFile = path.join("src", "__generated__", "nonna-dependencies.generated.ts");

    for (let i = 0; i < argv.length; i++) {
        if ((argv[i] === "--project" || argv[i] === "-p") && argv[i + 1]) {
            project = argv[++i]!;
        } else if ((argv[i] === "--output" || argv[i] === "-o") && argv[i + 1]) {
            outputFile = argv[++i]!;
        }
    }

    return {project: path.resolve(process.cwd(), project), outputFile: path.resolve(process.cwd(), outputFile)};
}

function main(): void {
    const {project, outputFile} = parseArgs(process.argv.slice(2));

    console.info("=================== Node-Boot Compiler (Nonna AOT) ===================");
    const result = compile({
        project,
        outputFile,
        additionalInjectableDecorators: NODE_BOOT_CLASS_DECORATORS,
        additionalInjectDecorators: NODE_BOOT_INJECT_DECORATORS,
    });

    if (!result.success) {
        console.error(formatDiagnostics(result.diagnostics));
        console.error(`❌ ${result.diagnostics.length} dependency resolution error(s). No file was generated.`);
        process.exit(1);
    }

    console.info(`✅ Generated dependencies for ${result.classCount} class(es) at ${result.outputFile}`);
}

main();
