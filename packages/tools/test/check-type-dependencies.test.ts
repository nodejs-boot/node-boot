/**
 * Smoke/integration tests for `src/check-type-dependencies.ts`.
 *
 * The script is a fully self-executing CLI (no exported functions, calls `process.exit`),
 * driven by `@manypkg/get-packages` against whatever pnpm workspace it's run from
 * (`getPackages(resolvePath("."))` - i.e. it resolves the workspace root from `process.cwd()`).
 * That makes it safe to point at disposable fixture workspaces via the child process `cwd`,
 * without touching the real monorepo.
 *
 * We run the real (unmodified) `src/check-type-dependencies.ts` file through `ts-node` in a
 * child process for each fixture, and assert on exit code + stdout/stderr content.
 */
import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const SCRIPT_PATH = path.resolve(__dirname, "../src/check-type-dependencies.ts");
// `-r <module>` is resolved relative to the child process's `cwd`, which for these tests is a
// disposable fixture directory with no `node_modules` of its own. Resolving `ts-node/register`
// to an absolute path up front (relative to *this* test file, which does have access to it)
// sidesteps that entirely - Node loads absolute `-r` paths directly, no resolution needed.
const TS_NODE_REGISTER = require.resolve("ts-node/register");

// eslint-disable-next-line no-control-regex -- ANSI escape sequences for stripping terminal colors
const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;
const stripAnsi = (value: string) => value.replace(ANSI_PATTERN, "");

function writeJsonFile(filePath: string, data: unknown) {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function makeFixtureWorkspace(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nodeboot-tools-type-deps-"));
    fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
    writeJsonFile(path.join(root, "package.json"), {
        name: "fixture-root",
        version: "1.0.0",
        private: true,
    });
    return root;
}

function writeFixturePackage(root: string, name: string, packageJsonExtra: Record<string, unknown>, indexDts: string) {
    writeJsonFile(path.join(root, "packages", name, "package.json"), {
        name,
        version: "1.0.0",
        types: "dist/index.d.ts",
        ...packageJsonExtra,
    });
    fs.mkdirSync(path.join(root, "packages", name, "dist"), {recursive: true});
    fs.writeFileSync(path.join(root, "packages", name, "dist/index.d.ts"), indexDts);
}

function runScript(cwd: string) {
    const result = spawnSync("node", ["-r", TS_NODE_REGISTER, SCRIPT_PATH], {
        cwd,
        encoding: "utf-8",
        env: {
            ...process.env,
            // The fixture cwd has no tsconfig.json of its own, so ts-node would otherwise fall
            // back to a default (type-checked) config that neither matches this repo's settings
            // nor even resolves modules consistently. We only care about runtime behavior here,
            // so skip type-checking and pin compiler options explicitly.
            TS_NODE_TRANSPILE_ONLY: "true",
            TS_NODE_COMPILER_OPTIONS: JSON.stringify({
                module: "commonjs",
                moduleResolution: "node",
                target: "es2019",
                esModuleInterop: true,
                skipLibCheck: true,
            }),
        },
    });
    return {
        status: result.status,
        stdout: stripAnsi(result.stdout ?? ""),
        stderr: stripAnsi(result.stderr ?? ""),
    };
}

describe("check-type-dependencies (CLI script)", () => {
    const fixtures: string[] = [];

    after(() => {
        for (const dir of fixtures) {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it("exits 0 and reports nothing for a package whose types have no dependency issues", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        // No `from '...'` imports at all -> nothing to check, nothing to report.
        writeFixturePackage(root, "pkg-valid", {}, "export {};\n");

        const result = runScript(root);

        assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
        assert.doesNotMatch(result.stderr, /Incorrect type dependencies/);
    });

    it("exits with code 2 and reports a missing type dependency", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        writeFixturePackage(
            root,
            "pkg-missing-type",
            {},
            "import {x} from 'totally-fake-nonexistent-module-xyz123';\nexport {x};\n",
        );

        const result = runScript(root);

        assert.equal(result.status, 2, `expected exit 2, got ${result.status}\n${result.stderr}`);
        assert.match(result.stderr, /Incorrect type dependencies in pkg-missing-type/);
        assert.match(result.stderr, /Missing a type dependency: totally-fake-nonexistent-module-xyz123/);
        assert.match(result.stderr, /At least one package had incorrect type dependencies/);
    });

    it("exits with code 2 and reports an unused @types/* dependency that should be a devDependency", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        // `@types/unused-thing` is declared but never actually required by the type declarations,
        // so the script should flag it as belonging in devDependencies instead.
        writeFixturePackage(root, "pkg-wrong-dep", {dependencies: {"@types/unused-thing": "^1.0.0"}}, "export {};\n");

        const result = runScript(root);

        assert.equal(result.status, 2, `expected exit 2, got ${result.status}\n${result.stderr}`);
        assert.match(result.stderr, /Incorrect type dependencies in pkg-wrong-dep/);
        assert.match(result.stderr, /Move from dependencies to devDependencies: @types\/unused-thing/);
    });
});
