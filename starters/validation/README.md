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

## Custom Validators and Validation Decorators

`@nodeboot/starter-validation` runs on top of `class-validator`, so any of its built-in decorators (`@IsString`, `@IsEmail`, `@IsIn`, `@IsArray`, ...) work out of the box on your DTOs/models. When a built-in rule isn't expressive enough for a domain-specific constraint — e.g. validating that a field follows your own naming convention, references a value that only your business logic can check, or applies a shared validation function from another package — you can write your own **custom validation decorator** using `class-validator`'s `registerDecorator` API. Node-Boot doesn't need anything special for this: a custom decorator is just a regular property decorator that you combine with `@Property()` (and `@Model()` from `@nodeboot/starter-openapi` if you also want it reflected in the generated OpenAPI schema) on the same class field.

### Writing a custom validator

Call `registerDecorator(...)` inside a decorator factory function, providing a `validate(value, args)` function that returns `true`/`false`, and a `defaultMessage(args)` function used to build the error message when validation fails. The validator can call into any other library or shared business logic — here it reuses a `validateName` helper from an internal package:

```typescript
import {registerDecorator, ValidationArguments, ValidationOptions} from "class-validator";
import {validateName} from "@tech-insights/fact";

/**
 * Validates that a string is a valid resource name: 1-63 characters,
 * lowercase letters, numbers, and hyphens only, starting/ending with
 * an alphanumeric character.
 */
export function IsValidName(validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: "IsValidName",
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, _args: ValidationArguments) {
                    // Check if value is a string
                    if (typeof value !== "string") {
                        return false;
                    }

                    // Validate naming rules
                    try {
                        validateName(value);
                        return true;
                    } catch {
                        return false;
                    }
                },
                defaultMessage(_args: ValidationArguments) {
                    return "Value must be a valid name: a string between 1-63 characters, containing only lowercase letters, numbers, and hyphens (must start and end with alphanumeric).";
                },
            },
        });
    };
}
```

### Using a custom validator on a model

Apply the custom decorator alongside `@Property()` (and any other `class-validator` decorators) exactly like a built-in one. Because it's a normal property decorator, it composes with `@Model()`, `@IsArray()`, `@IsIn()`, etc. without any special wiring:

```typescript
import {Model} from "@nodeboot/starter-openapi";
import {Property} from "@nodeboot/core";
import {IsArray, IsIn} from "class-validator";
import {DriverRole, DRIVER_ROLES} from "../../persistence";
import {IsValidName} from "../validators/IsValidName";

@Model()
export class CreateDriverRequest {
    @IsValidName()
    @Property({required: true, description: "Mercedes-Benz ID (unique identifier)"})
    mbId: string;

    @Property({required: true, description: "Name of the driver user"})
    name: string;

    @IsArray()
    @IsIn(DRIVER_ROLES, {each: true})
    @Property({required: true, description: "Roles: admin, driver"})
    roles: DriverRole[];
}
```

With `@Body({validate: true})` (or whichever parameter decorator you're using) applied on the controller action, `mbId` will be rejected with the `IsValidName` error message whenever it fails `validateName(...)`, exactly like any other `class-validator` constraint — no extra configuration needed in `@nodeboot/starter-validation` itself.

> 💡 Custom validators are plain `class-validator` decorators, so they're fully reusable outside of Node-Boot too (e.g. in shared DTO packages, tests, or other services), and they respect the same `app-config.yaml` validation options (`stopAtFirstError`, `whitelist`, etc.) documented above.

## License

This package is licensed under the MIT License.
