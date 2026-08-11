---
name: nodeboot-starter-backstage
description: Use when the user wants Backstage integration in a Node-Boot app with `@nodeboot/starter-backstage`; this starter is enabled with `@EnableBackstage()` and is the right skill for injecting a Backstage `CatalogClient`, `PluginDiscoveryService`, or raw `BackstageIntegrationConfig` from `integrations.backstage`.
---

# `@nodeboot/starter-backstage`

Use this starter when a Node-Boot service needs to query the Backstage software catalog or discover plugin base URLs. `@EnableBackstage()` registers `CatalogClient`, `PluginDiscoveryService`, and `BackstageIntegrationConfig` from app config.

## Enable

```ts
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

## Key config

```yaml
integrations:
    backstage:
        apiUrl: http://localhost:7051/api
        apiKey: "${BACKSTAGE_API_KEY}"
```

If configured, inject `CatalogClient` for catalog queries and `PluginDiscoveryService` for plugin URLs such as `scaffolder` or `techdocs`.

Full docs: [`starters/backstage/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/backstage/README.md)

## Validate

`cd starters/backstage && pnpm test`
