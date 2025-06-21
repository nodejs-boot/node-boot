#!/usr/bin/env node

/**
 * Node-Boot Circular Dependency Analyzer
 *
 * This script statically analyzes the TypeScript source code under the `src/` directory
 * to detect **circular dependencies** between services/components using class constructor
 * injection and NodeBoot decorators like `@Service` or `@Component`.
 *
 * ### Features:
 * - **Supports TypeScript 4 & 5**: Uses a compatibility wrapper for accessing decorators.
 * - **Decorator Filtering**: Only classes decorated with known injectable decorators are analyzed.
 * - **Dependency Graph**: Builds a constructor-based dependency graph of injected types.
 * - **Cycle Detection**: Uses depth-first search (DFS) to find cycles in the graph.
 * - **Fast & CI-Ready**: Designed to run post-lint/build in CI pipelines to fail on architecture violations.
 *
 * ### Usage:
 * Run manually or from `package.json` scripts:
 * ```sh
 * node node-boot-cycle-detector.js
 * ```
 *
 * ### Requirements:
 * - Your classes should use NodeBoot decorators (`@Service`, `@Component`, etc.)
 * - TypeScript must be configured with appropriate type information (e.g., not erased before analysis).
 * - The analysis is performed **before compilation**, directly on `.ts` files in `src/`.
 *
 * ---
 * Part of the Node-Boot developer toolchain for enforcing architectural soundness.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
import ts from "typescript";
import fs from "fs";
import path from "path";

// Define where to scan source files
const PROJECT_DIR = path.resolve(process.cwd(), "src");

// List of decorator names to track as injectable
const decoratorsToTrack = ["Service", "Component"];

// Internal graph structure: key = class, value = dependencies (as class names)
type Graph = Record<string, Set<string>>;

/**
 * Recursively collects all TypeScript files in a directory,
 * excluding `.d.ts` files.
 */
function getAllTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, {withFileTypes: true});
    let files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(getAllTsFiles(fullPath));
        } else if (fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts")) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * TypeScript 4/5 compatible way to get decorators from a node.
 */
function getDecorators(node: ts.Node): readonly ts.Decorator[] | undefined {
    if ((ts as any).canHaveDecorators && (ts as any).getDecorators) {
        // TS 5+
        if ((ts as any).canHaveDecorators(node)) {
            return (ts as any).getDecorators(node);
        }
        return undefined;
    }
    // TS 4 fallback
    return (node as any).decorators;
}

/**
 * Checks if a class declaration is decorated with any of the tracked decorator names.
 */
function hasDecorator(node: ts.ClassDeclaration, names: string[]): boolean {
    const decorators = getDecorators(node);
    return (decorators || []).some(d => {
        const call = d.expression;
        return ts.isCallExpression(call) && ts.isIdentifier(call.expression) && names.includes(call.expression.text);
    });
}

/**
 * Extracts type names from the constructor parameters as dependency identifiers.
 */
function getConstructorDependencies(node: ts.ClassDeclaration): string[] {
    const ctor = node.members.find(ts.isConstructorDeclaration) as ts.ConstructorDeclaration;
    if (!ctor) return [];

    return ctor.parameters
        .map(param => {
            if (param.type && ts.isTypeReferenceNode(param.type) && ts.isIdentifier(param.type.typeName)) {
                return param.type.typeName.text;
            }
            return null;
        })
        .filter((x): x is string => !!x);
}

/**
 * Parses all files and builds a dependency graph of decorated services/components.
 */
function buildServiceGraph(files: string[]): Graph {
    const graph: Graph = {};

    for (const file of files) {
        const code = fs.readFileSync(file, "utf-8");
        const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);

        ts.forEachChild(source, node => {
            if (ts.isClassDeclaration(node) && node.name && hasDecorator(node, decoratorsToTrack)) {
                const className = node.name.text;
                const deps = getConstructorDependencies(node);
                graph[className] = new Set(deps);
            }
        });
    }

    return graph;
}

/**
 * Runs a depth-first search on the graph to detect cycles.
 */
function detectCycles(graph: Graph): string[][] {
    const visited = new Set<string>();
    const pathStack = new Set<string>();
    const cycles: string[][] = [];

    function dfs(node: string, path: string[]) {
        if (pathStack.has(node)) {
            const idx = path.indexOf(node);
            cycles.push([...path.slice(idx), node]);
            return;
        }

        if (visited.has(node)) return;
        visited.add(node);
        pathStack.add(node);

        const deps = graph[node] || new Set();
        for (const dep of deps) {
            dfs(dep, [...path, node]);
        }

        pathStack.delete(node);
    }

    for (const node in graph) {
        dfs(node, []);
    }

    return cycles;
}

// ───────────────────────────────
// Execute the analysis
// ───────────────────────────────
console.info("===================== NodeBoot Cycle Detector =====================");

const files = getAllTsFiles(PROJECT_DIR);
const graph = buildServiceGraph(files);
const cycles = detectCycles(graph);

// Print results
if (cycles.length) {
    console.error(`❌ Detected ${cycles.length} circular service dependency(ies):\n`);
    for (const cycle of cycles) {
        console.error(" 🔁 " + cycle.join(" → "));
    }
    process.exit(1);
} else {
    console.log("✅ No circular service dependencies found.");
}

console.info("====================================================================");
