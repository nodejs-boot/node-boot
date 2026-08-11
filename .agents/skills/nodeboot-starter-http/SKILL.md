---
name: nodeboot-starter-http
description: Use when the user wants outbound HTTP clients in a Node-Boot app with `@nodeboot/starter-http`; this starter is enabled with `@EnableHttpClients()` and `@HttpClient(...)`, and it is specifically for calling external/internal APIs with Axios-backed clients rather than choosing an inbound HTTP server adapter such as Express, Fastify, Koa, or native HTTP.
---

# `@nodeboot/starter-http`

Use this starter for outbound API clients. It is not the skill for selecting the app's server adapter.

## Enable

```ts
@EnableDI(Container)
@EnableHttpClients()
@EnableComponentScan()
@NodeBootApplication()
export class SampleBackendApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Minimal client

```ts
@HttpClient("${integrations.http.sampleapi}")
export class SampleApiClient extends HttpClientStub {}
```

```yaml
integrations:
    http:
        sampleapi:
            baseURL: "https://jsonplaceholder.typicode.com"
            timeout: 5000
            httpLogging: true
            headers:
                X-API-KEY: "${API_KEY}"
```

`@HttpClient(...)` can also take an inline Axios-style config object when the client should not be config-driven.

Full docs: [`starters/http/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/http/README.md)

## Validate

`cd samples/sample-express && pnpm dev`
