#!/usr/bin/env node

import fs from "fs";
import path from "path";
import ts from "typescript";
import {generateSchema} from "typescript-json-schema";

/**
 * Node-Boot AOT Model Schema Generator
 *
 * This script performs **Ahead-of-Time (AOT)** compilation of all `@Model`-decorated
 * TypeScript classes found in the `src/` directory into a single OpenAPI-compatible
 * JSON schema file.
 *
 * ### Features:
 * - **Decorator-Driven**: Detects classes annotated with `@Model()` via static analysis.
 * - **JSON Schema Output**: Uses `typescript-json-schema` to convert TypeScript models into JSON Schema.
 * - **OpenAPI Ready**: Wraps output under `components.schemas` for OpenAPI integration.
 * - **Schema Merging**: Merges multiple model schemas into one unified structure.
 * - **Definition Ref Rewriting**: Converts `#/definitions/` to `#/components/schemas/`.
 *
 * ### Output:
 * Writes merged schema to:
 * ```
 * dist/node-boot-models.json
 * ```
 *
 * ### Usage:
 * Run manually:
 * ```sh
 * node node-boot-aot-models.js
 * ```
 *
 * Or add to your `package.json` scripts:
 * ```json
 * {
 *   "scripts": {
 *     "postbuild": "node node-boot-aot-models.js"
 *   }
 * }
 * ```
 *
 * ### Requirements:
 * - Ensure you have installed `typescript-json-schema`:
 *   ```sh
 *   npm install --save-dev typescript-json-schema
 *   ```
 * - Decorate your DTOs with `@Model()` from `@nodeboot/context`.
 *
 * ---
 * Inspired by AOT techniques to speed up runtime behavior by generating schemas ahead of startup.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */

const SRC_DIR = path.resolve(process.cwd(), "src");
const OUTPUT_PATH = path.resolve(process.cwd(), "dist/node-boot-models.json");

/**
 * Recursively searches for `.ts` files that contain the `@Model` decorator.
 *
 * @param {string} dir - Directory to search recursively.
 * @returns {string[]} Array of absolute file paths that contain `@Model`.
 */
function findModelFiles(dir) {
    const result = [];

    for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            result.push(...findModelFiles(fullPath));
        } else if (
            entry.endsWith(".ts") &&
            !entry.endsWith(".d.ts")
            //&& fs.readFileSync(fullPath, "utf-8").includes("@Model")
        ) {
            result.push(fullPath);
        }
    }

    return result;
}

/**
 * Creates a TypeScript program from a list of file paths.
 *
 * @param {readonly string[]} files - Paths to TypeScript files.
 * @returns {ts.Program} A TypeScript program instance.
 */
function createProgramFromFiles(files) {
    return ts.createProgram(files, {
        strictNullChecks: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.CommonJS,
    });
}

/**
 * Wraps collected schemas into an OpenAPI-compatible components object,
 * and removes unresolved $ref entries by replacing them with an empty object.
 *
 * @param {Record<string, object>} schemas - Individual schemas keyed by model name.
 * @returns {object} Merged and cleaned OpenAPI-compatible schema structure.
 */
function mergeSchemas(schemas) {
    const cleanedSchemas = {};

    // Helper to clean unresolved $ref
    const resolveRefs = obj => {
        if (Array.isArray(obj)) {
            return obj.map(resolveRefs);
        } else if (obj && typeof obj === "object") {
            if (obj.$ref) {
                const refMatch = obj.$ref.match(/^#\/definitions\/(.+)$/);
                if (refMatch) {
                    const refName = refMatch[1];
                    if (!schemas[refName]) {
                        // Replace unresolved $ref with empty object
                        return {};
                    }
                }
            }

            const result = {};
            for (const key of Object.keys(obj)) {
                result[key] = resolveRefs(obj[key]);
            }
            return result;
        }
        return obj;
    };

    for (const [key, schema] of Object.entries(schemas)) {
        cleanedSchemas[key] = resolveRefs(schema);
    }

    return {
        $schema: "http://json-schema.org/draft-07/schema#",
        components: {
            schemas: cleanedSchemas,
        },
    };
}

function extractModelAndEnumNames(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const modelMatches = [...content.matchAll(/@Model\(\)\s+export\s+class\s+(\w+)/g)];
    const enumMatches = [...content.matchAll(/export\s+enum\s+(\w+)/g)];

    const modelNames = modelMatches.map(([, name]) => name);
    const enumNames = enumMatches.map(([, name]) => name);

    return {
        modelNames,
        enumNames,
    };
}

/**
 * Main logic for generating and saving the OpenAPI schema
 * by scanning model files and converting classes to JSON Schema.
 */
function runAOTModelSchema() {
    console.log("🧠 Generating OpenAPI model schemas from @Model classes...");

    const modelFiles = findModelFiles(SRC_DIR);
    if (!modelFiles.length) {
        console.warn("⚠️ No @Model classes found.");
        return;
    }

    const program = createProgramFromFiles(modelFiles);
    const schemas = {};

    for (const sourceFile of modelFiles) {
        const {modelNames, enumNames} = extractModelAndEnumNames(sourceFile);

        for (const className of modelNames.concat(enumNames)) {
            // @ts-ignore
            const schema = generateSchema(program, className, {
                ref: true, // ⚠️ Enables `$ref` usage — better for reusability
                topRef: false, // Do NOT wrap entire schema in one top-level $ref
                titles: true, // Adds `title` field to each schema (improves Swagger UI)
                defaultProps: true, // Include default values if present
                ignoreErrors: true, // Prevent crashes on edge types
                aliasRef: true, // Keeps references to type aliases (important for enums and Records)
                validate: false, // Speeds up schema generation
            });

            if (schema) {
                delete schema["$schema"]; // Remove top-level $schema key
                delete schema["definitions"]; // Remove inlined definitions
                schemas[className] = schema;
            }
        }
    }

    const merged = mergeSchemas(schemas);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), {recursive: true});

    // Replace local $ref references to definitions with OpenAPI-style component references
    const modelsSchema = JSON.stringify(merged, null, 2).replace(/#\/definitions\//g, "#/components/schemas/");

    fs.writeFileSync(OUTPUT_PATH, modelsSchema);
    console.log(`✅ ${Object.keys(schemas).length} Model schemas saved to ${OUTPUT_PATH}`);
}

runAOTModelSchema();
