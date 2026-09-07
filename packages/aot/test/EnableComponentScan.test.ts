import {describe, it} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {EnableComponentScan} from "../src";
import {EnableComponentScan as EnableComponentScanFromDecoratorsIndex} from "../src/decorators";
import {EnableComponentScan as EnableComponentScanFromPackageIndex} from "../src/index";

/**
 * EnableComponentScan performs real filesystem scanning and dynamically `require()`s files
 * relative to `process.cwd()`. To unit test it without touching the real project tree, every
 * test builds an isolated temp directory that mimics a `dist/` output, points `process.cwd()`
 * at it via `t.mock.method`, and observes side effects through a shared log file that fixture
 * modules append to when they're `require()`d.
 */

function mkTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "nodeboot-aot-ecs-"));
}

function writeFile(baseDir: string, relPath: string, content: string): string {
    const fullPath = path.join(baseDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, content, "utf-8");
    return fullPath;
}

/**
 * Writes a plain CommonJS module that, when `require()`d, appends `marker` as a new line in
 * `logFile`. This lets tests assert exactly which fixture files were imported by the decorator
 * without relying on `require.cache` internals directly.
 *
 * The `decoratorMarker` (when provided) simulates how TypeScript compiles decorator usage down
 * to something like `(0, decorators_1.Service)()`, which is why `fileContainsRelevantDecorator`
 * in the source looks for the literal substring `"<DecoratorName>)"` rather than parsing AST.
 */
function writeBeanFile(baseDir: string, relPath: string, logFile: string, marker: string, decoratorMarker?: string) {
    const comment = decoratorMarker
        ? `// simulates compiled decorator call: (0, decorators_1.${decoratorMarker})()`
        : "// no relevant decorator usage here";
    const content = `${comment}\nconst fs = require("fs");\nfs.appendFileSync(${JSON.stringify(
        logFile,
    )}, ${JSON.stringify(marker)} + "\\n");\nmodule.exports = {marker: ${JSON.stringify(marker)}};\n`;
    return writeFile(baseDir, relPath, content);
}

function readLog(logFile: string): string[] {
    if (!fs.existsSync(logFile)) return [];
    return fs
        .readFileSync(logFile, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);
}

function silenceConsole(t: any) {
    t.mock.method(console, "log", () => {});
    t.mock.method(console, "error", () => {});
}

describe("EnableComponentScan - public exports", () => {
    it("is exported from decorators/index.ts and src/index.ts and is the same function", () => {
        assert.equal(typeof EnableComponentScan, "function");
        assert.equal(EnableComponentScanFromDecoratorsIndex, EnableComponentScan);
        assert.equal(EnableComponentScanFromPackageIndex, EnableComponentScan);
    });

    it("returns a class decorator function when invoked", () => {
        const decorator = EnableComponentScan();
        assert.equal(typeof decorator, "function");
    });
});

describe("EnableComponentScan - beans manifest resolution", () => {
    it("imports beans listed in dist/node-boot-beans.json and skips active scanning", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const logFile = path.join(tmpBase, "log.txt");
        t.mock.method(process, "cwd", () => tmpBase);

        writeBeanFile(tmpBase, "dist/beanA.js", logFile, "beanA");
        // A decoy file that active scanning *would* pick up, proving the beans manifest takes
        // priority and active scanning never runs when the manifest resolves successfully.
        writeBeanFile(tmpBase, "dist/decoyService.js", logFile, "decoyService", "Service");
        writeFile(tmpBase, "dist/node-boot-beans.json", JSON.stringify(["beanA.js"]));

        EnableComponentScan()(class Dummy {} as any);

        assert.deepEqual(readLog(logFile), ["beanA"]);
    });

    it("falls back to active scanning when node-boot-beans.json contains invalid JSON", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const logFile = path.join(tmpBase, "log.txt");
        t.mock.method(process, "cwd", () => tmpBase);

        writeFile(tmpBase, "dist/node-boot-beans.json", "{ not valid json ");
        writeBeanFile(tmpBase, "dist/serviceFile.js", logFile, "serviceFile", "Service");

        const errorSpy = t.mock.method(console, "error");

        EnableComponentScan()(class Dummy {} as any);

        assert.deepEqual(readLog(logFile), ["serviceFile"]);
        assert.ok(errorSpy.mock.callCount() >= 1, "expected console.error to be called for the malformed manifest");
    });

    it("falls back to active scanning when node-boot-beans.json is an empty array", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const logFile = path.join(tmpBase, "log.txt");
        t.mock.method(process, "cwd", () => tmpBase);

        writeFile(tmpBase, "dist/node-boot-beans.json", JSON.stringify([]));
        writeBeanFile(tmpBase, "dist/serviceFile.js", logFile, "serviceFile", "Service");

        EnableComponentScan()(class Dummy {} as any);

        assert.deepEqual(readLog(logFile), ["serviceFile"]);
    });

    it("ignores an existing beans manifest and forces active scanning when customDecorators are provided", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const logFile = path.join(tmpBase, "log.txt");
        t.mock.method(process, "cwd", () => tmpBase);

        // Points at a file that does not exist on disk. If the decorator tried to honor the
        // manifest despite customDecorators being set, requiring this path would throw.
        writeFile(tmpBase, "dist/node-boot-beans.json", JSON.stringify(["doesNotExist.js"]));

        function MyCustomDecorator() {
            /* marker function, only its .name is used */
        }
        writeBeanFile(tmpBase, "dist/customFile.js", logFile, "customFile", "MyCustomDecorator");

        assert.doesNotThrow(() => {
            EnableComponentScan({customDecorators: [MyCustomDecorator]})(class Dummy {} as any);
        });

        assert.deepEqual(readLog(logFile), ["customFile"]);
    });
});

describe("EnableComponentScan - active scanning", () => {
    it("recursively imports only .js files containing a relevant decorator marker, skipping index.js and .d.ts files", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const logFile = path.join(tmpBase, "log.txt");
        t.mock.method(process, "cwd", () => tmpBase);

        writeBeanFile(tmpBase, "dist/serviceFile.js", logFile, "serviceFile", "Service");
        writeBeanFile(tmpBase, "dist/plainFile.js", logFile, "plainFile" /* no decorator marker */);
        writeBeanFile(tmpBase, "dist/index.js", logFile, "index", "Service");
        writeFile(tmpBase, "dist/types.d.ts", "// Service)\nexport type Foo = {};\n");
        writeBeanFile(tmpBase, "dist/nested/nestedService.js", logFile, "nestedService", "Component");

        EnableComponentScan()(class Dummy {} as any);

        const loaded = readLog(logFile).sort();
        assert.deepEqual(loaded, ["nestedService", "serviceFile"]);
    });

    it("logs an error and does not throw when the resolved base path does not exist", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir(); // intentionally has no dist/ subdirectory
        t.mock.method(process, "cwd", () => tmpBase);
        const errorSpy = t.mock.method(console, "error");

        assert.doesNotThrow(() => {
            EnableComponentScan()(class Dummy {} as any);
        });

        assert.ok(errorSpy.mock.callCount() >= 1, "expected console.error to report the missing scan path");
    });

    it("treats a cwd that already contains 'dist' as the base path directly, without appending dist again", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const distDir = path.join(tmpBase, "dist");
        fs.mkdirSync(distDir, {recursive: true});
        const logFile = path.join(tmpBase, "log.txt");

        // cwd IS the dist directory itself
        t.mock.method(process, "cwd", () => distDir);

        writeBeanFile(distDir, "serviceFile.js", logFile, "serviceFile", "Service");

        EnableComponentScan()(class Dummy {} as any);

        assert.deepEqual(readLog(logFile), ["serviceFile"]);
    });

    it("does not re-import an already cached module on a second invocation", t => {
        silenceConsole(t);

        const tmpBase = mkTmpDir();
        const logFile = path.join(tmpBase, "log.txt");
        t.mock.method(process, "cwd", () => tmpBase);

        writeBeanFile(tmpBase, "dist/serviceFile.js", logFile, "serviceFile", "Service");

        EnableComponentScan()(class Dummy {} as any);
        EnableComponentScan()(class Dummy2 {} as any);

        // The module body (which appends to the log) only runs once because require() caches
        // by absolute path, so the second decorator application must skip it.
        assert.deepEqual(readLog(logFile), ["serviceFile"]);
    });
});
