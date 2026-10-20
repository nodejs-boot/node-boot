# NodeBoot HTTP Client Starter

The **NodeBoot HTTP Client Starter** provides a seamless way to integrate HTTP clients into your NodeBoot application. It allows you to declare HTTP clients, manage their lifecycle, and inject them into services using dependency injection (DI).

## 📦 Installation

```sh
npm install @nodeboot/starter-http
```

## 🚀 Features

-   Declarative HTTP clients using `@HttpClient()`
-   Fully configurable using Axios-based options
-   Integrated with the NodeBoot application lifecycle
-   Dependency injection support
-   Optional HTTP request/response logging

---

# 📖 Usage Guide

## 1️⃣ Enabling HTTP Clients in Your Application

To use HTTP clients in a NodeBoot application, enable the feature using `@EnableHttpClients()`:

```typescript
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableComponentScan} from "@nodeboot/scan";
import {EnableHttpClients} from "@nodeboot/starter-http";
@EnableHttpClients()
@EnableComponentScan()
@NodeBootApplication()
export class SampleBackendApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

---

## 2️⃣ Defining an HTTP Client

Use the `@HttpClient()` decorator to define an HTTP client. The client configuration extends Axios request settings.

```typescript
import {HttpClient, HttpClientStub} from "@nodeboot/starter-http";

@HttpClient({
    baseURL: "https://jsonplaceholder.typicode.com",
    timeout: 5000,
    httpLogging: true,
})
export class MicroserviceHttpClient extends HttpClientStub {}
```

Alternatively, the client can be configured using configuration properties right from the `app-config.yaml` file. In this case,
you should provide the placeholder for the config path and let Node-Boot autoconfigure it.

```typescript
import {HttpClient, HttpClientStub} from "@nodeboot/starter-http";

@HttpClient("${integrations.http.sampleapi}")
export class MicroserviceHttpClient extends HttpClientStub {}
```

```yaml
# app-config.yaml

integrations:
    http:
        sampleapi:
            baseURL: "https://jsonplaceholder.typicode.com"
            timeout: 5000
            httpLogging: true
            headers:
                X-API-KEY: ${API_KEY}
```

### Configuration Options

| Option        | Type    | Description                                 |
| ------------- | ------- | ------------------------------------------- |
| `baseURL`     | string  | Base URL for HTTP requests                  |
| `timeout`     | number  | Request timeout in milliseconds             |
| `headers`     | object  | Default headers for all requests            |
| `params`      | object  | Default query parameters                    |
| `httpLogging` | boolean | Enables logging for HTTP requests/responses |

---

## 3️⃣ Injecting the HTTP Client into a Service

Once defined, the HTTP client can be injected into a service for making API calls:

```typescript
import {Service} from "@nodeboot/core";
import {Logger} from "@nodeboot/logger";
import {MicroserviceHttpClient} from "./MicroserviceHttpClient";

@Service()
export class UserService {
    constructor(private readonly logger: Logger, private readonly httpClient: MicroserviceHttpClient) {}

    public async findExternalUsers(): Promise<User[]> {
        this.logger.info("Fetching users from external service...");
        const result = await this.httpClient.get("/users");
        this.logger.info(`Fetched ${result.data.length} users.`);
        return result.data;
    }
}
```

---

# 🎯 Summary

✅ **Enable HTTP clients** using `@EnableHttpClients()`  
✅ **Define HTTP clients** using `@HttpClient()`  
✅ **Inject them into services** for easy API integration  
✅ **Automatic logging** for debugging API calls

---

# 📜 License

This package is licensed under the MIT License.
