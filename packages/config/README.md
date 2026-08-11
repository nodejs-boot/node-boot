# ⚙️ `@nodeboot/config` – Node-Boot Configuration Support

## Overview

`@nodeboot/config` provides the configuration foundation for **Node-Boot** applications.

It loads application configuration from the same `app-config.yaml` / `app-config.local.yaml` conventions used across this repository, exposes a strongly-typed `ConfigService`, supports runtime reload notifications, and lets you bind configuration sections into injectable classes with `@ConfigurationProperties()`.

Under the hood it builds on Backstage's config loader/reader stack, which means YAML files, environment variable placeholders, includes, local overrides, and remote config targets all work together cleanly.

---

## ✨ Features

✅ **Typed config access** via `ConfigService` (`getString`, `getNumber`, `getBoolean`, etc.)  
✅ **Grouped config binding** with `@ConfigurationProperties()`  
✅ **Nested config views** with `getConfig()` and `getOptionalConfig()`  
✅ **YAML-first workflow** using `app-config.yaml` and `app-config.local.yaml`  
✅ **Environment placeholder support** such as `${SUPABASE_URL}` and `${BACKSTAGE_API_KEY:-dummy}`  
✅ **Config includes/local overrides** like `$include: app-credentials.local.yaml`  
✅ **Runtime reload notifications** through `ConfigService.subscribe()`  
✅ **Remote or file-based config targets** through `loadNodeBootConfig()`  
✅ **Simple in-memory config creation** for tests or ad-hoc bootstrapping via `loadConfig()`

---

## 📦 Installation

```sh
pnpm add @nodeboot/config
```

---

## 📚 Exported API

This package exports:

-   `ConfigurationProperties`
-   `ConfigService`
-   `loadNodeBootConfig`
-   `loadConfig`
-   `ConfigurationPropertiesMetadata`

---

## 🔥 Usage

### 1️⃣ Define configuration in `app-config.yaml`

A real pattern used in the repo looks like this:

```yaml
app:
    name: "facts-service"
    platform: "tech-insights"
    environment: "development"
    defaultErrorHandler: false
    port: 3000

server:
    cors:
        origin: "*"
```

You can also use environment placeholders and local overrides:

```yaml
integrations:
    supabase:
        url: ${SUPABASE_URL}
        serviceRoleKey: ${SUPABASE_SERVICE_ROLE_KEY}
```

```yaml
credentials:
    $include: app-credentials.local.yaml
```

---

### 2️⃣ Bind a config section with `@ConfigurationProperties()`

This is the exact pattern used in the sample applications:

```typescript
import {ConfigurationProperties} from "@nodeboot/config";

@ConfigurationProperties({
    configPath: "app",
    configName: "app-config",
})
export class AppConfigProperties {
    name: string;
    platform: string;
    environment: string;
    defaultErrorHandler: boolean;
    customErrorHandler?: boolean;
    port: number;
}
```

`configPath` points to the YAML section to bind, and `configName` is the bean name registered in the IoC container.

---

### 3️⃣ Inject the bound configuration bean

A real sample in this repository injects the config bean by name:

```typescript
import {Controller, Get} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {AppConfigProperties} from "../config/AppConfigProperties";

@Controller("/users", "v1")
export class UserController {
    constructor(
        @Inject("app-config")
        private readonly appConfigProperties: AppConfigProperties,
    ) {}

    @Get("/")
    async getUsers(): Promise<string> {
        return `Running on ${this.appConfigProperties.name}:${this.appConfigProperties.port}`;
    }
}
```

Use this approach when you want a whole config section as a structured object.

---

### 4️⃣ Read individual values with `ConfigService`

For one-off reads, inject `ConfigService` directly:

```typescript
import {Service} from "@nodeboot/core";
import {ConfigService} from "@nodeboot/config";

@Service()
export class UserService {
    constructor(private readonly configService: ConfigService) {}

    getAppName(): string {
        return this.configService.getString("app.name");
    }

    getPort(): number | undefined {
        return this.configService.getOptionalNumber("app.port");
    }
}
```

Available typed accessors include:

-   `get()` / `getOptional()`
-   `getString()` / `getOptionalString()`
-   `getNumber()` / `getOptionalNumber()`
-   `getBoolean()` / `getOptionalBoolean()`
-   `getStringArray()` / `getOptionalStringArray()`
-   `getConfig()` / `getOptionalConfig()`
-   `getConfigArray()` / `getOptionalConfigArray()`
-   `has()`
-   `keys()`
-   `subscribe()`

---

### 5️⃣ Work with nested configuration

```typescript
import {ConfigService} from "@nodeboot/config";

export class PersistenceInspector {
    constructor(private readonly config: ConfigService) {}

    read(): string | undefined {
        const persistence = this.config.getOptionalConfig("persistence");
        return persistence?.getOptionalString("type");
    }
}
```

`getConfig("...")` returns a child `ConfigService` view, so nested reads stay clean and explicit.

---

### 6️⃣ Create config in memory with `loadConfig()`

`loadConfig()` is useful for tests, local tooling, or manual bootstrapping:

```typescript
import {loadConfig} from "@nodeboot/config";

const config = loadConfig({
    app: {
        name: "demo-service",
        port: 3000,
    },
});

console.log(config.getString("app.name")); // demo-service
console.log(config.getNumber("app.port")); // 3000
```

---

### 7️⃣ Load file/remote config with `loadNodeBootConfig()`

`loadNodeBootConfig()` is the lower-level async loader used by Node-Boot server bootstrap.

```typescript
import {loadNodeBootConfig} from "@nodeboot/config";

const {config} = await loadNodeBootConfig({
    argv: process.argv,
    additionalConfigData: {
        app: {
            environment: "development",
        },
    },
});
```

It parses `--config` arguments, accepts local file paths or URLs, loads repository config files, and merges `additionalConfigData` on top.

---

## ⚙️ How It Works Internally

### `loadNodeBootConfig()`

`loadNodeBootConfig()` in `src/service/config.ts`:

-   parses CLI arguments with `minimist`
-   turns each `--config` value into either a `{path}` or `{url}` target
-   uses `findPaths(__dirname)` from `@backstage/cli-common` to locate the project root
-   calls `loadConfig()` from `@backstage/config-loader`
-   enables watch mode so config reloads can be observed at runtime
-   merges file-based configs with optional `additionalConfigData`
-   stores the final merged result in a `ConfigService`

When watched files change, it rebuilds the merged `ConfigReader` and calls `ConfigService.setConfig(...)`, which notifies subscribers.

### `ConfigService`

`ConfigService` in `src/service/ConfigService.ts`:

-   implements the `Config` contract from `@nodeboot/context`
-   wraps a Backstage `ConfigReader`
-   exposes typed getters for strings, numbers, booleans, arrays, and nested objects
-   supports `subscribe()` for reload notifications
-   creates read-only child views through `getConfig()` / `getOptionalConfig()`
-   forwards subscriptions from child views back to the root config instance

### `@ConfigurationProperties()`

`ConfigurationProperties()` in `src/decorator/ConfigurationProperties.ts`:

-   writes metadata (`config:isConfigProperties` and `config:path`) on the decorated class
-   registers a `ConfigurationPropertiesAdapter` in `ApplicationContext.get().configurationPropertiesAdapters`
-   during binding, resolves the root `config` bean from the IoC container
-   reads the object at `args.configPath`
-   creates an instance of the decorated class
-   copies enumerable config properties onto that instance
-   registers the populated instance under `args.configName`

If the config section is missing, or if another bean already uses the same `configName`, the adapter throws immediately.

---

## 🧩 When to Use What

-   Use **`ConfigService`** when you want individual config values or dynamic path access.
-   Use **`@ConfigurationProperties()`** when you want a whole section as a typed injectable object.
-   Use **`loadConfig()`** for in-memory/test scenarios.
-   Use **`loadNodeBootConfig()`** when you are building or customizing bootstrap/loading behavior.

---

## ⚠️ Common Issues

### Missing config section

If a decorated properties class points at a path that does not exist, binding fails with an error like:

```text
Configuration for prefix 'app' not found.
```

Make sure `configPath` matches the YAML structure exactly.

### Duplicate `configName`

If two `@ConfigurationProperties()` classes register the same `configName`, startup fails.

Use unique bean names for each bound config object.

### Required getters throw on missing or invalid values

Methods like `getString()`, `getNumber()`, and `getBoolean()` are strict by design.

If a value is optional, prefer:

-   `getOptionalString()`
-   `getOptionalNumber()`
-   `getOptionalBoolean()`
-   `getOptionalConfig()`

### Child config views are not standalone mutable configs

Instances returned by `getConfig()` are scoped views over the parent config. They forward reads and subscriptions to the parent rather than owning separate state.

---

## ✅ Summary

`@nodeboot/config` gives Node-Boot applications a practical, strongly-typed configuration layer with YAML loading, env placeholder support, nested config access, runtime reload notifications, and object binding through `@ConfigurationProperties()`.

If you want Spring-Boot-style configuration organization in Node-Boot, this package is the core building block.
