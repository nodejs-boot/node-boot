# Node-Boot Starter Validation

## Overview

The `@nodeboot/starter-validation` package provides an auto-configuration mechanism for request validation in Node.js applications using `class-validator`. This package integrates with the **Node-Boot** framework and supports Express, Fastify, and Koa.

## Features

-   Automatic request validation for **body and params**
-   Customizable validation rules via `app-config.yaml`
-   Global validation middleware
-   Supports multiple application frameworks
-   Fine-grained control over validation per parameter

## Installation

```sh
npm install @nodeboot/starter-validation class-validator class-transformer
```

## Enabling Validations

To enable validations, use the `@EnableValidations` decorator in your application class:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/scan";
import {EnableValidations} from "@nodeboot/starter-validation";

@EnableDI(Container)
@EnableValidations()
@EnableComponentScan()
@NodeBootApplication()
export class App implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Configuration

Validation settings can be customized in `app-config.yaml` under `api.validations`:

```yaml
api:
    validations:
        enableDebugMessages: false
        skipUndefinedProperties: false
        skipNullProperties: false
        skipMissingProperties: false
        whitelist: false
        forbidNonWhitelisted: false
        forbidUnknownValues: true
        stopAtFirstError: false
```

## Usage

### Defining DTOs

Define a **Data Transfer Object (DTO)** using `class-validator` decorators:

```typescript
import {IsString, IsEmail, MinLength} from "class-validator";

export class UserDto {
    @IsEmail()
    email: string;

    @MinLength(6)
    password: string;
}
```

### Applying DTO to Controllers

The validation is automatically applied to **body and params**. You can also define it explicitly for specific parameters:

```typescript
import {Controller, Post, Body} from "@nodeboot/core";
import {UserDto} from "../dtos/user.dto";

@Controller("/users")
export class UserController {
    @Post("/login")
    login(@Body({validate: true}) user: UserDto) {
        console.log(`${user.email} is a valid e-mail!`);
        console.log(`${user.password.length} is at least 6 characters long!`);
    }
}
```

If validation fails, a `400 Bad Request` response is returned with validation details.

## Example Response (Validation Error)

```json
{
    "name": "BadRequestError",
    "message": "minLength->password must be longer than or equal to 9 characters",
    "errors": [
        {
            "value": "string",
            "property": "password",
            "constraints": {
                "minLength": "password must be longer than or equal to 9 characters"
            }
        }
    ]
}
```

## Fine-Grained Control

If you want to turn on validation for only specific parameters, you can use:

```typescript
@Post("/register")
register(@Body({ validate: true }) user: UserDto) {}
```

This technique works not only with `@Body` but also with `@Param`, `@QueryParam`, `@BodyParam`, etc.

For more advanced usage, refer to [class-validator documentation](https://github.com/typestack/class-validator).

## License

This package is licensed under the MIT License.
