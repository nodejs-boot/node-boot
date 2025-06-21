# `@nodeboot/aot`

> 🧠 Ahead-of-Time (AOT) support for the [Node-Boot](https://www.npmjs.com/package/node-boot) framework — enabling faster startup, intelligent component scanning, and OpenAPI-ready model schemas.

---

## ✨ Overview

`@nodeboot/aot` provides a set of tools and decorators to **optimize Node-Boot apps for production**, by shifting expensive runtime operations to build-time via Ahead-of-Time (AOT) processing.

It includes:

-   🔍 **Bean Scanner & Generator** (`node-boot-aot-beans.js`)
    Scans compiled files for decorators like `@Service`, `@Controller`, etc., and generates a precomputed `node-boot-beans.json`.

-   📦 **Component Scanner Decorator** (`@EnableComponentScan`)
    Automatically imports application components at runtime from the prebuilt manifest or falls back to dynamic scanning.

-   🧬 **Model Schema Generator** (`node-boot-aot-models.js`)
    Converts `@Model`-decorated classes into OpenAPI-compatible JSON Schemas.

---

## 📦 Installation

```bash
npm install @nodeboot/aot --save-dev
```

---

## ⚙️ Usage Guide

### 1. 🧠 **Generate AOT Beans Metadata**

After building your app (`tsc`), run the AOT bean scanner to precompile metadata for your components:

```bash
node node-boot-aot-beans.js
```

#### Add to `package.json`:

```json
{
    "scripts": {
        "postbuild": "node node-boot-aot-beans.js"
    }
}
```

This will output `dist/node-boot-beans.json` — a list of all `.js` files that contain key decorators such as `@Service`, `@Controller`, etc.

---

### 2. 🧬 **Generate OpenAPI JSON Schemas from `@Model` Classes**

To convert all `@Model`-decorated classes into OpenAPI-compatible schema:

```bash
node node-boot-aot-models.js
```

This will generate:
`dist/node-boot-models.json` — structured like:

```json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "components": {
        "schemas": {
            "UserModel": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"}
                }
            }
        }
    }
}
```

### 🔁 All-in-One Runner

Runs both scripts in one go. Ideal for post-build automation.

```shell
node node-boot-aot.js
```

💡 Suggested in `package.json`:

```json
{
    "scripts": {
        "postbuild": "node node-boot-aot.js"
    }
}
```

---

## 🧠 Runtime Integration

In your main application class, use the `@EnableComponentScan()` decorator to bootstrap bean registration:

```ts
import {EnableComponentScan} from "@nodeboot/aot";

@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

### Optional: Use Custom Decorators

```ts
@EnableComponentScan({
  customDecorators: [MyCustomBean, AnotherDecorator]
})
```

> ✅ Automatically resolves the `dist/` directory in production and performs active scanning in dev (or if no JSON file is found).

---

## 📁 Directory Expectations

| Directory | Purpose                                                       |
| --------: | ------------------------------------------------------------- |
|    `src/` | Your TypeScript source files                                  |
|   `dist/` | Compiled output after `tsc`                                   |
|   `.json` | Output files: `node-boot-beans.json`, `node-boot-models.json` |

---

## 🛠 Internals

### Scripts

-   `node-boot-aot-beans.js`:
    Scans compiled JS files for known decorators (`@Service`, `@Controller`, etc.) and generates `node-boot-beans.json`.

-   `node-boot-aot-models.js`:
    Scans `@Model()`-decorated classes and generates a JSON Schema file (`node-boot-models.json`).

-   `node-boot-cycle-detector.js`:
    Detects circular dependencies in the bean graph, ensuring no infinite loops in component/service resolution.

-   `node-boot-aot.js`:
    Combines all AOT scripts into a single runner for convenience.

### Decorator

-   `@EnableComponentScan(options?: { customDecorators?: Function[] })`:
    Scans and imports bean modules based on decorators. Uses prebuilt JSON for performance when available.

---

## ✅ Benefits

-   **Fast Startup**: Avoids expensive runtime filesystem scans in production.
-   **Predictable Component Importing**: Always imports only what’s required.
-   **OpenAPI-Ready**: JSON schema generation for API modeling & docs.
-   **Flexible**: Supports custom decorators and intelligent fallbacks.

---

## 🔮 Future Ideas

-   CLI interface for all AOT operations
-   Watch mode for development
-   Decorator metadata validation

---

## 👨‍💻 Author

**Manuel Santos**
📧 [ney.br.santos@gmail.com](mailto:ney.br.santos@gmail.com)
🌐 [GitHub](https://github.com/manusant)

---

## 📝 License

MIT — feel free to use, modify, and contribute.
