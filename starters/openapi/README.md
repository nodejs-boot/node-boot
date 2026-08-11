# 📘 `@nodeboot/starter-openapi` – Node-Boot OpenAPI Starter

## Overview

The `@nodeboot/starter-openapi` package generates an **OpenAPI 3** specification from your Node-Boot controllers and can also serve **Swagger UI** for interactive API documentation.

It reads Node-Boot route metadata, request parameter metadata, response metadata, model metadata, and `class-validator` rules to build a spec automatically.

---

## ✨ Features

✅ **Automatic OpenAPI 3 generation** from Node-Boot controllers  
✅ **Swagger UI integration** at `/api-docs`  
✅ **Schema generation from models** decorated with `@Model()`  
✅ **`class-validator` support** for richer schema output  
✅ **Endpoint customization** with `@OpenAPI()`  
✅ **Response documentation** with `@ResponseSchema()`  
✅ **Works with Express, Fastify, Koa, and native HTTP**

---

## 🚀 Installation

```sh
pnpm add @nodeboot/starter-openapi
```

---

## 🔥 Usage

### 1️⃣ Enable OpenAPI generation

Add `@EnableOpenApi()` to your application class. This exposes the generated JSON spec at:

-   `/api-docs/swagger.json`

If you also want the Swagger UI, add `@EnableSwaggerUI()`.

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableOpenApi, EnableSwaggerUI} from "@nodeboot/starter-openapi";

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

> `@EnableOpenApi()` enables spec generation. `@EnableSwaggerUI()` additionally serves the Swagger UI at `/api-docs/` and redirects `/docs` to `/api-docs/`.

---

### 2️⃣ Document controller endpoints

Use `@ResponseSchema()` to describe successful responses and `@OpenAPI()` to override or extend the generated operation. `@OpenAPI()` can be applied at the controller or method level.

```typescript
import {Body, Controller, Get, HttpCode, Param, Post, Put} from "@nodeboot/core";
import {OpenAPI, ResponseSchema} from "@nodeboot/starter-openapi";
import {CreateUserDto, UpdateUserDto, UserModel} from "../models";

@Controller("/users", "v1")
export class UserController {
    @Get("/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
    async getUsers(): Promise<UserModel[]> {
        return [];
    }

    @Get("/:id")
    @OpenAPI({summary: "Get a user by ID"})
    @ResponseSchema(UserModel)
    async getUserById(@Param("id") userId: string): Promise<UserModel> {
        return {} as UserModel;
    }

    @Post("/")
    @HttpCode(201)
    @OpenAPI({summary: "Create a new user"})
    @ResponseSchema(UserModel)
    async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
        return {} as UserModel;
    }

    @Put("/:id")
    @OpenAPI({summary: "Update a user"})
    @ResponseSchema(UserModel)
    async updateUser(@Param("id") userId: string, @Body() userData: UpdateUserDto): Promise<UserModel> {
        return {} as UserModel;
    }
}
```

What is inferred automatically:

-   **paths** from `@Controller()` + HTTP method decorators
-   **path params** from `@Param()` and route templates like `/:id`
-   **query params** from query parameter decorators and query DTOs
-   **request body** from `@Body()` / body parameter metadata
-   **success status code** from response metadata such as `@HttpCode(201)`
-   **tags** from the controller class name (for example `UserController` → `User`)

---

### 3️⃣ Document response bodies

`@ResponseSchema()` accepts either a model class or a primitive type string.

#### Model response

```typescript
@Get("/:id")
@ResponseSchema(UserModel)
async getUserById(@Param("id") userId: string): Promise<UserModel> {
    return {} as UserModel;
}
```

#### Array response

```typescript
@Get("/")
@ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
async getUsers(): Promise<UserModel[]> {
    return [];
}
```

#### Primitive response

```typescript
import {Controller, Get} from "@nodeboot/core";
import {ResponseSchema} from "@nodeboot/starter-openapi";

@Controller("/hello", "v1")
export class HelloController {
    @Get("/")
    @ResponseSchema("string")
    async hello(): Promise<string> {
        return "Hello, World!";
    }
}
```

Supported primitive names include `string`, `number`, `integer`, `boolean`, `object`, and `array`.

---

### 4️⃣ Define schemas with `@Model()`

Use `@Model()` on DTOs and response models that should appear under `components.schemas`. For response classes, `@ResponseSchema()` can auto-register the class, but explicitly decorating models with `@Model()` is the clearest approach.

```typescript
import {Property} from "@nodeboot/core";
import {IsEmail} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class UserModel {
    @Property({description: "User ID"})
    id: number;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property({description: "User name"})
    name?: string;
}
```

### 5️⃣ Use validation decorators for richer schemas

Validation metadata is converted into OpenAPI schema details through `class-validator-jsonschema`.

```typescript
import {IsNotEmpty, IsString, MaxLength, MinLength} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class UpdateUserDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(9)
    @MaxLength(32)
    password: string;
}
```

This is especially useful for request DTOs passed to `@Body()`.

---

### 6️⃣ Generic models are supported

The starter can resolve generic model bindings when you provide them to `@Model()`.

```typescript
import {Page} from "@nodeboot/core";
import {Model} from "@nodeboot/starter-openapi";
import {UserModel} from "./UserModel";

@Model({T: UserModel})
export class UserPage extends Page<UserModel> {}
```

This pattern is used in the sample MongoDB application for paginated responses.

---

### 7️⃣ Configure OpenAPI metadata in `app-config.yaml`

OpenAPI settings are loaded from the `openapi` configuration path.

```yaml
openapi:
    info:
        contact:
            name: "Manuel Santos"
            email: "ney.br.santos@gmail.com"
            url: "https://www.linkedin.com/in/manuel-brito-dos-santos-a7a20a6b/"
        license:
            name: MIT
            url: "https://github.com/nodejs-boot/node-boot/blob/main/LICENSE"
    servers:
        - url: http://localhost:3000
          description: Localhost server
    externalDocs:
        url: "https://nodeboot.gitbook.io/"
        description: "Node-Boot official documentation"
    securitySchemes:
        basicAuth:
            scheme: "basic"
            type: "http"
```

Supported config keys are:

-   `info`
-   `servers`
-   `security`
-   `tags`
-   `externalDocs`
-   `securitySchemes`

If present, these values are merged into the generated OpenAPI document. By default, `title`, `version`, and `description` are taken from the application's build info and can be overridden here.

---

### 8️⃣ Swagger UI routes

When `@EnableSwaggerUI()` is enabled, the starter serves:

-   `GET /api-docs/` → Swagger UI
-   `GET /api-docs/swagger.json` → generated OpenAPI JSON
-   `GET /docs` → redirect to `/api-docs/`

These routes are built into the starter for all supported server adapters.

---

## 🧠 How spec generation works

At startup, the starter:

1. collects Node-Boot controller/action metadata
2. converts controller routes into OpenAPI paths
3. infers parameters and request bodies from method parameter metadata
4. builds schemas from `@Model()` classes
5. merges in `class-validator`-derived schemas
6. loads precompiled schemas from `dist/node-boot-models.json` when available
7. merges `openapi` config values into the final document

`@OpenAPI()` metadata is applied last, so it can override generated operation fields such as `summary`, `description`, `responses`, `security`, and more.

---

## 📦 Exports

This package primarily exposes:

-   `EnableOpenApi`
-   `EnableSwaggerUI`
-   `OpenAPI`
-   `ResponseSchema`
-   `Model`

---

## ✅ Supported servers

-   Express
-   Fastify
-   Koa
-   Native HTTP

---

## 📄 License

MIT
