---
name: nodeboot-starter-openai
description: Use when the user wants an OpenAI or OpenAI-compatible client in a Node-Boot app with `@nodeboot/starter-openai`; this starter is enabled with `@EnableOpenAI()` and wires an injectable `OpenAI` client from `integrations.openai` settings such as `apiKey`, `baseURL`, `organization`, `project`, `timeout`, and `maxRetries`.
---

# `@nodeboot/starter-openai`

Use this starter for one default OpenAI-compatible client loaded from config. If the app needs multiple named AI clients, the package README shows the custom `@Configuration()` + `@Bean("name")` pattern instead of `@EnableOpenAI()`.

## Enable

```ts
@EnableDI(Container)
@EnableOpenAI()
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
    openai:
        apiKey: "${OPENAI_API_KEY}"
        organization: "your-org-id"
        project: "your-project-id"
        baseURL: "https://api.openai.com/v1/"
        timeout: 5000
        maxRetries: 2
```

Once enabled, inject `OpenAI` directly into services for `chat.completions.create(...)` and other SDK calls.

Full docs: [`starters/openai/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/openai/README.md)

## Validate

`cd starters/openai && pnpm test`
