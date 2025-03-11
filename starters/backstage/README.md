# Backstage Starter for NodeBoot - User Guide

## Introduction

The `@nodeboot/starter-backstage` package enables seamless integration of [Backstage](https://backstage.io/) into NodeBoot-based applications. It provides a structured way to configure the Backstage Catalog Client using dependency injection (DI) and `app-config.yaml`.

## Installation

To use the Backstage starter in your project, install it via npm or yarn:

```sh
npm install @nodeboot/starter-backstage
```

or

```sh
yarn add @nodeboot/starter-backstage
```

## Configuration

### 1. Define Backstage Configuration in `app-config.yaml`

Ensure that your `app-config.yaml` file includes the necessary Backstage integration settings:

```yaml
integrations:
    backstage:
        apiUrl: http://localhost:7051/api
        apiKey: ${BACKSTAGE_API_KEY:-dummy}
```

-   `apiUrl`: The URL of your Backstage instance.
-   `apiKey`: API key used for authentication (optional but recommended).

### 2. Enable Backstage in Your Application

In your main application class, use the `@EnableBackstage()` decorator to enable Backstage integration:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/scan";
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

### 3. Inject Backstage Catalog Client into Your Services

Once enabled, you can inject the `CatalogClient` into your services to interact with Backstage:

```typescript
import {Service} from "@nodeboot/core";
import {CatalogClient} from "@backstage/catalog-client";

@Service()
export class MyService {
    constructor(private catalogClient: CatalogClient) {}

    async getEntities() {
        return this.catalogClient.getEntities();
    }
}
```

## Verifying the Integration

1. Start your Backstage instance (`yarn dev` if running locally).
2. Ensure your `app-config.yaml` contains the correct Backstage API URL and credentials.
3. Run your NodeBoot application (`pnpm start`).
4. Check logs to confirm the Backstage client was successfully configured.

## Troubleshooting

### Issue: "Backstage Catalog client was not created"

**Solution:** Ensure that `app-config.yaml` includes the `integrations.backstage` section with the correct `apiUrl` and `apiKey`.

### Issue: "401 Unauthorized when accessing Backstage API"

**Solution:** Verify that the API key is correctly set and has the required permissions.

## Conclusion

The `@nodeboot/starter-backstage` package simplifies Backstage integration in NodeBoot applications. By following this guide, you can configure and use Backstage Catalog Client effectively within your services.

For more details, refer to the official [Backstage documentation](https://backstage.io/docs).
