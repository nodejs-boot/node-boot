# 🛠️ `@nodeboot/tools` – Node-Boot CI/CD & Automation Helpers

## Overview

The `@nodeboot/tools` package contains the internal automation scripts used by the **Node-Boot** monorepo during development, validation, and release workflows.

It is focused on **repository health checks** rather than runtime features. Today, the package provides helpers to:

-   validate **type dependency declarations** for published packages,
-   verify **local workspace dependency versions**, and
-   run **documentation quality checks** with [Vale](https://docs.errata.ai/vale/).

---

## ✨ Features

✅ **Type dependency validation** – scans generated `dist/index.d.ts` files and checks whether required type packages are declared correctly.  
✅ **Workspace dependency verification** – ensures local package version ranges match the actual versions in the monorepo.  
✅ **Docs quality automation** – runs Vale against Markdown files for writing quality and spelling checks.  
✅ **CI-friendly scripts** – designed to be called from `package.json` scripts and GitHub Actions workflows.

---

## 📦 Installation

Install it as a development dependency:

```sh
pnpm add -D @nodeboot/tools
```

> `@nodeboot/tools` does **not** expose a `bin` entry in `package.json`.
> The package is intended to be invoked through script paths such as `node ./node_modules/@nodeboot/tools/dist/...`.

---

## 🚀 Usage

Inside this package itself, the available npm scripts are:

```json
{
    "scripts": {
        "nodeboot:check:type-deps": "node ./dist/check-type-dependencies.js",
        "nodeboot:check:local-deps": "node ./dist/verify-local-dependencies.js",
        "nodeboot:check:docs-quality": "node ./dist/check-docs-quality.js"
    }
}
```

When consuming `@nodeboot/tools` from another repository or workspace, a typical setup is to expose the tools through your own `package.json` scripts:

```json
{
    "scripts": {
        "nodeboot:check:type-deps": "node ./node_modules/@nodeboot/tools/dist/check-type-dependencies.js",
        "nodeboot:check:local-deps": "node ./node_modules/@nodeboot/tools/dist/verify-local-dependencies.js",
        "nodeboot:check:docs": "node ./node_modules/@nodeboot/tools/dist/check-docs-quality.js"
    }
}
```

This is exactly how the root `package.json` in the Node-Boot monorepo wires the package.

---

## 🔍 Available Commands

### 1️⃣ `check-type-dependencies.js`

Validates that published packages with generated type declarations have the right type-related dependencies.

#### What it checks

-   only checks packages that are **not private**,
-   require a `types` entry in `package.json`, and
-   already have a generated `dist/index.d.ts` file.

It scans imports in `dist/index.d.ts` and then verifies whether:

-   required `@types/*` packages are present,
-   type packages were incorrectly placed in `devDependencies`, or
-   unnecessary `@types/*` packages were placed in runtime dependencies.

#### Example

```sh
node ./node_modules/@nodeboot/tools/dist/check-type-dependencies.js
```

#### How Node-Boot uses it

In the monorepo root:

```json
{
    "scripts": {
        "nodeboot:check:type-deps": "node ./node_modules/@nodeboot/tools/dist/check-type-dependencies.js"
    }
}
```

In CI and release workflows:

```yaml
- name: build all packages
  run: pnpm build

- name: verify type dependencies
  run: pnpm nodeboot:check:type-deps
```

> Build first. This script inspects generated `dist/index.d.ts` files, so packages must already be compiled.

---

### 2️⃣ `verify-local-dependencies.js`

Checks whether workspace packages depend on the correct versions of other local workspace packages.

#### What it checks

For each workspace package, the script inspects:

-   `dependencies`
-   `devDependencies`
-   `peerDependencies`
-   `optionalDependencies`

If a package depends on another local package using a range that does not satisfy that local package's actual version, the script reports it.

It skips:

-   empty ranges, and
-   `link:` dependencies.

#### Fix mode

You can automatically rewrite invalid ranges to `^<localVersion>` with `--fix`:

```sh
node ./node_modules/@nodeboot/tools/dist/verify-local-dependencies.js --fix
```

#### Example check

```sh
node ./node_modules/@nodeboot/tools/dist/verify-local-dependencies.js
```

This command is exposed by the monorepo as:

```json
{
    "scripts": {
        "nodeboot:check:local-deps": "node ./node_modules/@nodeboot/tools/dist/verify-local-dependencies.js"
    }
}
```

---

### 3️⃣ `check-docs-quality.js`

Runs documentation quality checks on Markdown files using [Vale](https://docs.errata.ai/vale/).

#### What it does

-   lints tracked Markdown files in the repository,
-   or, if file paths are provided as arguments, lints only those files,
-   reports spelling/writing issues through Vale,
-   suggests updating `.github/styles/vocab.txt` when new valid words are needed.

#### Local vs CI behavior

-   **Locally**: if `vale` is not installed, the script **skips** the check with a message.
-   **In CI**: if `vale` is not installed, the script **fails**.

When no file list is provided, the script gathers Markdown files from `git ls-files` and excludes:

-   `ADOPTERS.md`
-   `OWNERS.md`

#### Examples

Check all tracked Markdown files:

```sh
node ./node_modules/@nodeboot/tools/dist/check-docs-quality.js
```

Check only specific files:

```sh
node ./node_modules/@nodeboot/tools/dist/check-docs-quality.js README.md packages/tools/README.md
```

Monorepo script:

```json
{
    "scripts": {
        "nodeboot:check:docs": "node ./node_modules/@nodeboot/tools/dist/check-docs-quality.js"
    }
}
```

---

## 🏗️ How This Package Is Used in the Node-Boot Monorepo

The repository currently uses `@nodeboot/tools` in a few real places:

### Root `package.json`

```json
{
    "scripts": {
        "nodeboot:check:type-deps": "node ./node_modules/@nodeboot/tools/dist/check-type-dependencies.js",
        "nodeboot:check:local-deps": "node ./node_modules/@nodeboot/tools/dist/verify-local-dependencies.js",
        "nodeboot:check:docs": "node ./node_modules/@nodeboot/tools/dist/check-docs-quality.js"
    },
    "lint-staged": {
        "*.{ts,tsx,js,jsx}": ["pnpm tsc", "pnpm nodeboot:check:type-deps", "pnpm lint-format:fix"]
    }
}
```

### GitHub Actions

Both `.github/workflows/ci.yml` and `.github/workflows/release.yml` run:

```yaml
- name: verify type dependencies
  run: pnpm nodeboot:check:type-deps
```

This makes `check-type-dependencies.js` part of the monorepo's real CI/release validation path.

---

## ⚠️ Notes

-   These tools are meant for **automation and repository maintenance**, not for application runtime code.
-   `check-type-dependencies.js` is most useful for packages that publish TypeScript declaration files.
-   `check-docs-quality.js` depends on **Vale** being installed if you want docs checks to run locally.
-   Because there is no package `bin`, consumers typically expose these scripts through their own `package.json` commands.

---

## 📄 License

MIT
