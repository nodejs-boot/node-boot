---
name: nodeboot-starter-openapi
description: Use when the user wants generated API documentation in a Node-Boot app with `@nodeboot/starter-openapi`; this starter is enabled with `@EnableOpenApi()` and optionally `@EnableSwaggerUI()`, and it is the right skill for OpenAPI 3 spec generation, Swagger UI, `@Model()`, `@OpenAPI()`, and `@ResponseSchema()`.
---

# `@nodeboot/starter-openapi`

Use this starter when existing controllers and DTOs should produce an OpenAPI 3 spec automatically. `@EnableOpenApi()` exposes `/api-docs/swagger.json`; `@EnableSwaggerUI()` adds `/api-docs`.

## Enable

```ts
@EnableDI(Container)
@EnableOpenApi()
@EnableSwaggerUI()
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Minimal documentation example

```ts
@Get("/:id")
@OpenAPI({summary: "Get a user by ID"})
@ResponseSchema(UserModel)
async getUserById(@Param("id") userId: string): Promise<UserModel> {
    return {} as UserModel;
}
```

## Key config

There is no `integrations.*` block; use the top-level `openapi` node for `info`, `servers`, `security`, `tags`, `externalDocs`, and `securitySchemes`.

Full docs: [`starters/openapi/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/openapi/README.md)

## Validate

`cd samples/sample-express && pnpm dev`
