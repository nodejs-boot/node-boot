# 🎭 Backstage Starter for Node-Boot

## Overview

The `@nodeboot/starter-backstage` package integrates [Backstage](https://backstage.io/) — Spotify's open platform for
building developer portals — into Node-Boot applications. It auto-configures a
[`CatalogClient`](https://backstage.io/docs/features/software-catalog/software-catalog-api/) so your services can
query the Backstage Software Catalog (entities, locations, ancestry, facets, ...) using dependency injection, driven
entirely by `app-config.yaml`.

This is useful when a Node-Boot service needs to enrich its own domain data with organizational metadata already
tracked in Backstage — for example, resolving the owning team of a component, validating that a caller-supplied
`entityRef` exists in the catalog, or looking up dependent systems before performing an operation.

## ✨ Features

-   ✅ Auto-configured Backstage `CatalogClient`, ready to `@Inject()` into any Node-Boot component
-   ✅ Config-driven setup — no manual client construction, just `apiUrl`/`apiKey` in `app-config.yaml`
-   ✅ Static API key authentication with **per-request token override** support
-   ✅ `PluginDiscoveryService` bean for resolving base URLs of other Backstage plugins (e.g. `scaffolder`, `techdocs`)
-   ✅ Injectable `BackstageIntegrationConfig` for components that need the raw `apiUrl`/`apiKey`
-   ✅ Graceful no-op with a clear warning log when Backstage isn't configured, instead of a hard failure

## 🚀 Installation

```sh
npm install @nodeboot/starter-backstage
```

or

```sh
yarn add @nodeboot/starter-backstage
```

## ⚙️ Configuration

Add the Backstage integration settings to your `app-config.yaml`:

```yaml
integrations:
    backstage:
        apiUrl: http://localhost:7051/api
        apiKey: ${BACKSTAGE_API_KEY:-dummy}
```

| Property | Required | Description                                                                                        |
| -------- | -------- | -------------------------------------------------------------------------------------------------- |
| `apiUrl` | Yes      | Base URL of your Backstage backend (typically the `discovery` root, e.g. `http://host/api`).       |
| `apiKey` | No       | Static token sent as `Authorization`/`token` on every catalog request, unless overridden per-call. |

If `integrations.backstage` is missing, the starter logs a warning and skips catalog client registration entirely —
your application still boots, but `CatalogClient`/`PluginDiscoveryService` won't be available for injection.

## 🔌 Enabling Backstage Integration

Apply `@EnableBackstage()` on your application class:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableBackstage} from "@nodeboot/starter-backstage";

@EnableDI(Container)
@EnableBackstage()
@EnableComponentScan()
@NodeBootApplication()
export class MyApplication implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

`@EnableBackstage()` reads `integrations.backstage` from your config, then registers a `CatalogClient` and a
`PluginDiscoveryService` bean in the DI container.

## 💉 Injecting the Catalog Client

Once enabled, inject `CatalogClient` (from `@backstage/catalog-client`) into any Node-Boot service or controller —
the injected instance is a proxy that transparently attaches your configured `apiKey` to every request:

```typescript
import {Service} from "@nodeboot/core";
import {CatalogClient} from "@backstage/catalog-client";

@Service()
export class ComponentOwnershipService {
    constructor(private readonly catalogClient: CatalogClient) {}

    async getOwningTeam(entityRef: string) {
        const entity = await this.catalogClient.getEntityByRef(entityRef);
        return entity?.spec?.owner;
    }

    async listComponents() {
        return this.catalogClient.getEntities({
            filter: {kind: "component"},
        });
    }
}
```

### Overriding the Auth Token Per Request

The injected client implements the full `CatalogApi` surface (`getEntities`, `getEntityByRef`, `queryEntities`,
`addLocation`, `validateEntity`, etc.) and accepts the standard `CatalogRequestOptions` on every call. Pass a
`token` explicitly to use a caller-supplied credential instead of the statically configured `apiKey` — useful when
forwarding a user's own Backstage token to preserve their catalog permissions:

```typescript
await this.catalogClient.getEntities({filter: {kind: "component"}}, {token: userSuppliedToken});
```

## 💉 Injecting the Plugin Discovery Service

Backstage exposes many plugins beyond the catalog (`scaffolder`, `techdocs`, `search`, ...), each reachable under a
different path off the same backend. `PluginDiscoveryService` resolves the base URL for any plugin ID from the
configured `apiUrl`, so you don't have to hardcode plugin paths across your services:

```typescript
import {Service} from "@nodeboot/core";
import {PluginDiscoveryService} from "@nodeboot/starter-backstage";

@Service()
export class ScaffolderClient {
    constructor(private readonly discovery: PluginDiscoveryService) {}

    async getScaffolderBaseUrl() {
        // e.g. "http://localhost:7051/api/scaffolder"
        return this.discovery.getPluginUrl("scaffolder");
    }
}
```

> ⚠️ Always call `getPluginUrl()` immediately before making a request rather than caching the result — this keeps
> your code compatible with more advanced discovery/routing strategies in the future.

## 💉 Injecting the Raw Integration Config

If a component needs direct access to the configured `apiUrl`/`apiKey` (for example, to call a Backstage endpoint not
covered by `CatalogApi`), inject `BackstageIntegrationConfig` directly:

```typescript
import {Service} from "@nodeboot/core";
import {BackstageIntegrationConfig} from "@nodeboot/starter-backstage";

@Service()
export class CustomBackstageClient {
    constructor(private readonly backstageConfig: BackstageIntegrationConfig) {
        // backstageConfig.apiUrl, backstageConfig.apiKey
    }
}
```

## Verifying the Integration

1. Start your Backstage instance (`yarn dev` if running locally).
2. Ensure your `app-config.yaml` contains the correct Backstage API URL and credentials.
3. Run your Node-Boot application (`pnpm start`).
4. Check logs for `"Backstage Catalog client successfully configured..."` and
   `"Backstage Plugin endpoint discovery successfully configured..."`.

## 🧯 Troubleshooting

### Issue: "Backstage integration not configured" warning

**Solution:** Ensure `app-config.yaml` includes the `integrations.backstage` section with `apiUrl` (and `apiKey` if
your Backstage instance requires authentication). Without this, `CatalogClient` and `PluginDiscoveryService` are
never registered, and injecting them will fail.

### Issue: "401 Unauthorized" when accessing Backstage API

**Solution:** Verify that `apiKey` is correctly set and has the required permissions on the Backstage backend. If
you need per-user permissions, pass a `token` via `CatalogRequestOptions` on individual calls instead of relying on
the static `apiKey`.

## 🎉 Conclusion

The `@nodeboot/starter-backstage` package gives Node-Boot applications a config-driven, injectable client for the
Backstage Software Catalog, plus a discovery helper for reaching other Backstage plugins — with no manual client
wiring required.

## 📚 Resources

-   [Backstage Documentation](https://backstage.io/docs)
-   [Backstage Software Catalog API](https://backstage.io/docs/features/software-catalog/software-catalog-api/)
-   [`@backstage/catalog-client` on npm](https://www.npmjs.com/package/@backstage/catalog-client)
