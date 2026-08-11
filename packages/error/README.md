# ❗ `@nodeboot/error` – Node-Boot Base Errors & Exceptions

## Overview

The `@nodeboot/error` package provides the built-in exception hierarchy used across **Node-Boot**.

It gives you a small set of reusable HTTP-aware error classes for controller and service code, plus framework-level exceptions used during:

-   request parameter binding
-   JSON/body parsing
-   authorization checks
-   current-user resolution
-   global error serialization

When you throw an `HttpError` (or any subclass), Node-Boot drivers use its `httpCode` to set the HTTP response status automatically.

---

## ✨ Features

✅ **HTTP-aware base class** via `HttpError`  
✅ **Ready-made 4xx/5xx exceptions** for common API responses  
✅ **Authorization errors** for `@Authorized()` and `@CurrentUser` flows  
✅ **Parameter binding errors** for invalid, missing, or malformed input  
✅ **Framework integration** with Node-Boot's global error handling across Express, Fastify, Koa, native HTTP, Ghost, and Lambda  
✅ **Customizable serialization** through custom error handlers or `toJSON()`

---

## 🚀 Installation

```sh
pnpm add @nodeboot/error
```

---

## 📦 Exports

```typescript
import {
    AccessDeniedError,
    AuthorizationCheckerNotDefinedError,
    AuthorizationRequiredError,
    BadRequestError,
    CurrentUserCheckerNotDefinedError,
    ForbiddenError,
    HttpError,
    InternalServerError,
    InvalidParamError,
    MethodNotAllowedError,
    NotAcceptableError,
    NotFoundError,
    ParameterParseJsonError,
    ParamRequiredError,
    UnauthorizedError,
} from "@nodeboot/error";
```

---

## 🔥 Usage

### 1️⃣ Throw built-in HTTP errors from your service layer

The repository samples use `NotFoundError` for missing resources and `HttpError` directly for custom statuses such as `409 Conflict`.

```typescript
import {HttpError, NotFoundError} from "@nodeboot/error";

export class UserService {
    async findUserById(userId: number) {
        const user = await this.userRepository.findOneBy({id: userId});

        if (!user) {
            throw new NotFoundError("User doesn't exist");
        }

        return user;
    }

    async createUser(userData: CreateUserDto) {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        if (existingUser) {
            throw new HttpError(409, `This email ${userData.email} already exists`);
        }

        return this.userRepository.save(userData);
    }
}
```

### 2️⃣ Use them naturally from Node-Boot controllers

This matches how the sample applications protect routes with `@Authorized()` while letting services throw `HttpError` subclasses.

```typescript
import {Body, Controller, Get, Param, Post} from "@nodeboot/core";
import {Authorized} from "@nodeboot/authorization";

@Controller("/users", "v1")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get("/:id")
    async getUserById(@Param("id") userId: number) {
        return this.userService.findUserById(userId);
    }

    @Post("/")
    @Authorized()
    async createUser(@Body() userData: CreateUserDto) {
        return this.userService.createUser(userData);
    }
}
```

### 3️⃣ Customize the error response shape

If you register a custom `@ErrorHandler()`, you can transform `HttpError` objects before they are written to the response.

```typescript
import {ErrorHandler} from "@nodeboot/core";
import {Action, ErrorHandlerInterface} from "@nodeboot/context";
import {HttpError} from "@nodeboot/error";
import {Request, Response} from "express";

@ErrorHandler()
export class ErrorMiddleware implements ErrorHandlerInterface<HttpError, Request, Response> {
    async onError(error: HttpError, action: Action<Request, Response>): Promise<void> {
        const status = error.httpCode || 500;

        action.response.status(status).json({
            message: error.message,
            statusCode: error.httpCode,
        });
    }
}
```

If you do **not** register a custom handler, Node-Boot's default global error handler serializes errors to JSON using the error `name`, `message`, and any extra enumerable properties.

---

## 🧭 Built-in error classes

| Export                                | Extends               | HTTP status | Typical use                                                                       |
| ------------------------------------- | --------------------- | ----------: | --------------------------------------------------------------------------------- |
| `HttpError`                           | `Error`               |      custom | Base class for arbitrary HTTP responses such as `new HttpError(409, "Conflict")`. |
| `BadRequestError`                     | `HttpError`           |         400 | Generic invalid request/input error.                                              |
| `UnauthorizedError`                   | `HttpError`           |         401 | Authentication is required or invalid.                                            |
| `ForbiddenError`                      | `HttpError`           |         403 | Request is authenticated but not allowed.                                         |
| `NotFoundError`                       | `HttpError`           |         404 | Resource does not exist.                                                          |
| `MethodNotAllowedError`               | `HttpError`           |         405 | HTTP method is not allowed for the target operation.                              |
| `NotAcceptableError`                  | `HttpError`           |         406 | Response cannot satisfy the requested format/constraints.                         |
| `InternalServerError`                 | `HttpError`           |         500 | Generic internal framework/application error.                                     |
| `AccessDeniedError`                   | `ForbiddenError`      |         403 | Thrown when `@Authorized()` denies access.                                        |
| `AuthorizationRequiredError`          | `UnauthorizedError`   |         401 | Thrown when `@CurrentUser` or an authorization flow requires authentication.      |
| `AuthorizationCheckerNotDefinedError` | `InternalServerError` |         500 | `@Authorized()` is used, but no `authorizationChecker` is configured.             |
| `CurrentUserCheckerNotDefinedError`   | `InternalServerError` |         500 | `@CurrentUser` is used, but no `currentUserChecker` is configured.                |
| `ParamRequiredError`                  | `BadRequestError`     |         400 | A required route/body/query/header/file/session/cookie parameter is missing.      |
| `ParameterParseJsonError`             | `BadRequestError`     |         400 | A string parameter expected to contain JSON cannot be parsed.                     |
| `InvalidParamError`                   | `BadRequestError`     |         400 | A parameter cannot be normalized into the requested target type.                  |

> Note: `InvalidParamError` is exported under that class name, but its `name` property is set to `"ParamNormalizationError"`.

---

## 🔐 Authorization-related behavior

Node-Boot uses this package internally during authorization checks:

-   `AccessDeniedError` → when `@Authorized()` fails for the current request
-   `AuthorizationCheckerNotDefinedError` → when `@Authorized()` is used without an `authorizationChecker`
-   `AuthorizationRequiredError` → when a current user is required but unavailable
-   `CurrentUserCheckerNotDefinedError` → when `@CurrentUser` is used without a `currentUserChecker`

These errors are created by the framework drivers and parameter handlers, so in many cases you do not need to throw them manually.

---

## 🧪 Parameter binding behavior

`@nodeboot/error` is also used internally by Node-Boot's action parameter pipeline:

-   `ParamRequiredError` is thrown when a required parameter is missing
-   `InvalidParamError` is thrown when a primitive value cannot be converted to the declared type
-   `ParameterParseJsonError` is thrown when JSON parsing fails for object/array-style input
-   `BadRequestError` is also used for validation failures after request transformation/validation

This means controller signatures such as `@Param("id") userId: number` automatically participate in consistent 400-level error handling.

---

## 🌐 How global error handling works

Across the built-in Node-Boot drivers, the flow is consistent:

1. A controller/service throws an `HttpError` (or subclass).
2. The active driver reads `error.httpCode` and applies it to the HTTP response.
3. If a custom `@ErrorHandler()` is registered, it gets the first chance to shape the response.
4. Otherwise, Node-Boot's default `GlobalErrorHandler` serializes the error object.

By default, serialized errors include:

-   `name`
-   `message`
-   any extra enumerable properties you added

The default serializer omits stack traces and does not include `httpCode` in the JSON body for `HttpError` instances.

If your error class implements `toJSON()`, that result is used instead.

---

## 📝 Notes

-   This package has **no runtime dependencies** listed in its `package.json`.
-   It is intended to be used by both application code and Node-Boot internals.
-   Use `HttpError` when you need a status code not covered by the built-in subclasses.

---

## 📄 License

MIT
