/**
 * Smoke/integration tests for `src/verify-local-dependencies.ts`.
 *
 * The script is a fully self-executing CLI (no exported functions, calls `process.exit`) that
 * verifies every local (workspace) package dependency range is satisfied by the actual local
 * package version, and can rewrite them with `--fix`.
 *
 * Unlike `check-type-dependencies.ts`, this script resolves its workspace root from its own
 * location on disk (`resolvePath(__dirname, "..")`), *not* from `process.cwd()`. That means a
 * disposable fixture directory only works if the script itself is copied into it (so `__dirname`
 * lands inside the fixture). We copy the real, unmodified source verbatim - never edited - into
 * each fixture's `src/` folder and run it there via `ts-node`.
 *
 * Fixtures live under a tmp directory, but the script's own runtime dependencies (fs-extra,
 * semver, @manypkg/get-packages, chalk) are made resolvable by symlinking this package's real
 * `node_modules` into the fixture root (Node's module resolution walks up from the copied
 * script's directory and finds it there).
 */
import {after, describe, it} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const REAL_SCRIPT_SOURCE = fs.readFileSync(path.resolve(__dirname, "../src/verify-local-dependencies.ts"), "utf-8");
const REAL_NODE_MODULES = path.resolve(__dirname, "../node_modules");
const TS_NODE_REGISTER = require.resolve("ts-node/register");

function writeJsonFile(filePath: string, data: unknown) {
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readJsonFile(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Builds a disposable workspace fixture with a copy of the real script inside it (so the
 * script's own `__dirname`-based root resolution lands on the fixture, not the real monorepo).
 */
function makeFixtureWorkspace(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "nodeboot-tools-local-deps-"));
    fs.symlinkSync(REAL_NODE_MODULES, path.join(root, "node_modules"), "dir");
    fs.writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
    writeJsonFile(path.join(root, "package.json"), {
        name: "fixture-root",
        version: "1.0.0",
        private: true,
    });
    fs.mkdirSync(path.join(root, "src"), {recursive: true});
    fs.writeFileSync(path.join(root, "src/verify-local-dependencies.ts"), REAL_SCRIPT_SOURCE);
    return root;
}

function writeFixturePackage(root: string, name: string, packageJsonExtra: Record<string, unknown>) {
    writeJsonFile(path.join(root, "packages", name, "package.json"), {
        name,
        version: "1.0.0",
        ...packageJsonExtra,
    });
}

function runScript(cwd: string, args: string[] = []) {
    const result = spawnSync("node", ["-r", TS_NODE_REGISTER, "src/verify-local-dependencies.ts", ...args], {
        cwd,
        encoding: "utf-8",
        env: {
            ...process.env,
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
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
    };
}

describe("verify-local-dependencies (CLI script)", () => {
    const fixtures: string[] = [];

    after(() => {
        for (const dir of fixtures) {
            fs.rmSync(dir, {recursive: true, force: true});
        }
    });

    it("exits 0 when every local dependency range is satisfied", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        writeFixturePackage(root, "pkg-a", {});
        writeFixturePackage(root, "pkg-b", {dependencies: {"pkg-a": "^1.0.0"}});

        const result = runScript(root);

        assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
        assert.doesNotMatch(result.stdout, /depends on the wrong version/);
    });

    it("exits with code 2 and reports a local dependency range that doesn't satisfy the local version", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        writeFixturePackage(root, "pkg-a", {});
        writeFixturePackage(root, "pkg-b", {dependencies: {"pkg-a": "^2.0.0"}});

        const result = runScript(root);

        assert.equal(result.status, 2, `expected exit 2, got ${result.status}\n${result.stderr}`);
        assert.match(result.stdout, /depends on the wrong version of pkg-a: \^2\.0\.0 does not satisfy 1\.0\.0/);
    });

    it("--fix rewrites the offending package.json range in place and exits 0", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        writeFixturePackage(root, "pkg-a", {});
        writeFixturePackage(root, "pkg-b", {dependencies: {"pkg-a": "^2.0.0"}});

        const result = runScript(root, ["--fix"]);

        assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);

        const fixedPkgB = readJsonFile(path.join(root, "packages/pkg-b/package.json"));
        assert.equal(fixedPkgB.dependencies["pkg-a"], "^1.0.0");
    });

    it("ignores link: ranges and blank ranges", () => {
        const root = makeFixtureWorkspace();
        fixtures.push(root);

        writeFixturePackage(root, "pkg-a", {});
        writeFixturePackage(root, "pkg-b", {
            dependencies: {"pkg-a": "link:../pkg-a"},
            devDependencies: {"pkg-a": ""},
        });

        const result = runScript(root);

        assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stderr}`);
        assert.doesNotMatch(result.stdout, /depends on the wrong version/);
    });
});
