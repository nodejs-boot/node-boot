# 🔐 `@nodeboot/authorization` – Authorization Support for Node-Boot

## Overview

The `@nodeboot/authorization` package adds authorization hooks to a **Node-Boot** application through decorators and checker classes.

It provides three focused APIs:

-   `@EnableAuthorization(...)` to register your authorization and current-user resolvers
-   `@Authorized(...)` to protect controllers or controller actions
-   `@CurrentUser(...)` to inject the authenticated user into action parameters

This package does **not** implement authentication by itself. Instead, it connects your own logic to the Node-Boot request pipeline.

---

## ✨ Features

✅ **Decorator-based route protection** using `@Authorized()`  
✅ **Role-aware authorization** using `@Authorized("ADMIN")` or `@Authorized(["ADMIN", "USER"])`  
✅ **Current user injection** with `@CurrentUser()` in controller method parameters  
✅ **Application-level setup** through `@EnableAuthorization(...)`  
✅ **Works with Node-Boot controllers and drivers** by integrating with framework metadata and request handling  
✅ **DI-friendly design** because checker classes are resolved from the application container

---

## 🚀 Installation

Install the package in your Node-Boot project:

```sh
pnpm add @nodeboot/authorization
```

In a typical application, you will use it together with `@nodeboot/core`, a server package such as `@nodeboot/express-server`, and your DI setup.

---

## 📦 Exported API

This package exports:

-   `EnableAuthorization`
-   `Authorized`
-   `CurrentUser`

---

## 🔥 Usage

### 1️⃣ Register authorization in your application

`@EnableAuthorization(currentUserCheckerClass, authorizationCheckerClass)` stores the checker classes in the Node-Boot application context so they can be resolved and used at runtime.

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootAppView, NodeBootApplication} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableAuthorization} from "@nodeboot/authorization";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationResolver} from "./auth/DefaultAuthorizationResolver";

@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
@EnableComponentScan()
@NodeBootApplication()
export class SampleApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

This matches the pattern used in the repository samples for Express, Fastify, Koa, and the native HTTP server.

---

### 2️⃣ Implement a `CurrentUserChecker`

A current-user checker implements `CurrentUserChecker` from `@nodeboot/context`. Its `check(action)` method should resolve the user associated with the incoming request.

```typescript
import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Request, Response} from "express";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<Request, Response> {
    async check(action: Action<Request, Response>): Promise<any> {
        const authHeader = action.request.headers.authorization;

        if (!authHeader) {
            return null;
        }

        return {
            id: 1,
            username: "exampleUser",
            roles: ["USER", "ADMIN"],
        };
    }
}
```

In this repo, sample resolvers read request data and return a user object for downstream controller logic.

---

### 3️⃣ Implement an `AuthorizationChecker`

An authorization checker implements `AuthorizationChecker` from `@nodeboot/context`. Node-Boot calls `check(action, roles)` for routes decorated with `@Authorized(...)`.

```typescript
import {Component} from "@nodeboot/core";
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Request, Response} from "express";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<Request, Response> {
    async check(_: Action<Request, Response>, roles: string[]): Promise<boolean> {
        const user = {
            roles: ["USER", "ADMIN"],
        };

        if (user && !roles.length) {
            return true;
        }

        return !!roles.find(role => user.roles.includes(role));
    }
}
```

### What the `roles` argument means

-   `@Authorized()` → authorization is required, but no specific role is demanded
-   `@Authorized("ADMIN")` → your checker receives `roles = ["ADMIN"]`
-   `@Authorized(["ADMIN", "USER"])` → your checker receives both role values

---

### 4️⃣ Protect controller actions with `@Authorized`

Real sample controllers in this repository use `@Authorized()` and `@Authorized("ADMIN")` directly on Node-Boot actions.

```typescript
import {Body, Controller, Get, HttpCode, Post} from "@nodeboot/core";
import {Authorized, CurrentUser} from "@nodeboot/authorization";

@Controller("/users", "v1")
export class UserController {
    @Get("/me")
    @Authorized()
    async me(@CurrentUser({required: true}) currentUser: any) {
        return currentUser;
    }

    @Post("/")
    @HttpCode(201)
    @Authorized("ADMIN")
    async createUser(@Body() userData: {email: string; username: string}, @CurrentUser() currentUser: any) {
        return {
            createdBy: currentUser,
            userData,
        };
    }
}
```

A few important details come from the actual implementation:

-   `@Authorized()` stores authorization metadata for the target action
-   `@CurrentUser()` registers a special parameter of type `"current-user"`
-   `@CurrentUser({required: true})` forces authorization and raises an authorization error if no user is resolved

---

### 5️⃣ Apply `@Authorized` at controller level

The `Authorized` decorator supports both controller-level and method-level metadata. Internally, class-level roles are merged with action-level roles.

```typescript
import {Controller, Get} from "@nodeboot/core";
import {Authorized} from "@nodeboot/authorization";

@Authorized("ADMIN")
@Controller("/admin")
export class AdminController {
    @Get("/stats")
    async stats() {
        return {ok: true};
    }
}
```

Use this when an entire controller should share the same access requirement.

---

## ⚙️ How it Works Internally

This package is intentionally small, but it plugs into several core Node-Boot internals.

### `EnableAuthorization`

`EnableAuthorization` writes checker classes into `ApplicationContext`:

-   `ApplicationContext.get().authorizationChecker`
-   `ApplicationContext.get().currentUserChecker`

Later, `@NodeBootApplication()` resolves those classes from the IoC container and passes the resulting instances into the server driver.

### `Authorized`

`Authorized` uses `NodeBootToolkit.getMetadataArgsStorage().responseHandlers.push(...)` with:

-   `type: "authorized"`
-   `target`
-   `method`
-   `value: roleOrRoles`

That metadata is later read by `ControllerMetadata` and `ActionMetadata`.

-   `ControllerMetadata.build(...)` detects class-level authorization
-   `ActionMetadata.build(...)` merges controller-level and action-level roles into `authorizedRoles`

When a request reaches a protected route, Node-Boot drivers such as the Express, Fastify, Koa, and HTTP drivers call:

```ts
authorizationChecker.check(action, actionMetadata.authorizedRoles);
```

If authorization fails:

-   no roles specified → authorization is treated as required authentication
-   roles specified → access is denied for insufficient privileges

### `CurrentUser`

`CurrentUser` uses `NodeBootToolkit.getMetadataArgsStorage().params.push(...)` with `type: "current-user"`.

At runtime, `ActionParameterHandler` sees that parameter type and calls:

```ts
currentUserChecker.check(action);
```

If you marked the parameter as required and the checker returns no user, Node-Boot raises an authorization-required error.

---

## 🏭 Production Use Cases

The examples above show the shape of the API. The two walkthroughs below are closer to what you'd actually ship: a JWT-based gateway token (e.g. behind Backstage or your own auth-gateway) and a Firebase Authentication ID-token flow. Both cache the resolved user on the request so the current-user checker and the authorization checker don't verify the token twice per request.

### 1️⃣ JWT (asymmetric, gateway-issued token) with role-based access control

This setup verifies an `ES256`-signed JWT forwarded by an upstream gateway as a standard `Authorization: Bearer <token>` header, extracts the caller identity from the `sub` claim, resolves their role from a database record, and enforces `@Authorized(roles)` accordingly. It works identically on Express, Fastify, Koa, or the native HTTP server — only the request/response generic types change.

**`JwtAuthService.ts`** — verifies the token and returns the subject claim:

```typescript
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {jwtVerify, JWTVerifyGetKey} from "jose";
import {UnauthorizedError} from "@nodeboot/error";
import {Logger} from "winston";

export const AUTH_HEADER = "authorization";
export const BEARER_PREFIX = "Bearer ";

export type JwtVerifyOptions = {
    issuer?: string;
    audience?: string;
};

/**
 * Verifies the ES256 JWT forwarded by the auth-gateway in the standard
 * `Authorization: Bearer <token>` header: signature, `exp` (enforced by
 * `jose`), an `ES256` algorithm whitelist, and, when configured, `iss`/`aud`.
 *
 * The `sub` claim carries the caller's id and is returned to callers so
 * downstream guards can look up the user record.
 */
@Component()
export class JwtAuthService {
    @Inject("auth.jwks")
    private getKey: JWTVerifyGetKey;

    @Inject("auth.jwtVerifyOptions")
    private verifyOptions: JwtVerifyOptions;

    @Inject()
    private logger: Logger;

    /**
     * @returns the `sub` claim when the header is present and valid, or
     * `undefined` when the header is missing entirely.
     * @throws UnauthorizedError when the header is present but invalid/expired
     * or when the `sub` claim is missing.
     */
    async verifyRequest(request: {
        headers: Record<string, string | string[] | undefined>;
    }): Promise<string | undefined> {
        const raw = request.headers[AUTH_HEADER];
        const header = Array.isArray(raw) ? raw[0] : raw;
        if (!header || !header.startsWith(BEARER_PREFIX)) {
            return undefined;
        }

        const token = header.slice(BEARER_PREFIX.length).trim();
        if (!token) {
            return undefined;
        }

        try {
            const {payload} = await jwtVerify(token, this.getKey, {
                algorithms: ["ES256"],
                issuer: this.verifyOptions.issuer,
                audience: this.verifyOptions.audience,
            });
            const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
            if (!sub) {
                this.logger.warn(`Rejected ${AUTH_HEADER} token: missing 'sub' claim`);
                throw new UnauthorizedError("Invalid token");
            }
            return sub;
        } catch (err) {
            if (err instanceof UnauthorizedError) {
                throw err;
            }
            this.logger.warn(`Rejected ${AUTH_HEADER} token: ${(err as Error).message}`);
            throw new UnauthorizedError("Invalid token");
        }
    }
}
```

> `auth.jwks` (a `JWTVerifyGetKey` from `jose`, e.g. `createRemoteJWKSet(new URL(issuerJwksUri))`) and `auth.jwtVerifyOptions` are registered as beans in a `@Configuration` class so they can be swapped per environment without touching this service.

**`LoggedInUserResolver.ts`** — the `CurrentUserChecker`, responsible for populating `request.user`:

> ⚠️ **A note on injecting persistence beans into authorization checkers.** Authorization/current-user checkers are resolved and wired up very early in the application bootstrap (via `@EnableAuthorization(...)`), before `@nodeboot/starter-persistence` has necessarily finished registering its repository beans in the same IoC container. Constructor/property injection (`@Inject()`) of a `@DataRepository(...)` class at this point is not currently guaranteed to work. Until this bootstrap-ordering limitation is resolved, resolve persistence-backed repositories **lazily, per-request**, straight from the DI container (`Container.has(...)` / `Container.get(...)`) instead of injecting them as class fields. Everything else (the logger, `JwtAuthService`, other non-persistence beans) can keep using normal `@Inject()` injection as usual.

```typescript
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Container} from "typedi";
import {Logger} from "winston";
import {UserRepository} from "../persistence/UserRepository";
import {JwtAuthService} from "./JwtAuthService";

export type Role = "admin" | "member" | "user";
export type AuthenticatedUser = {id: string; roles: string[]; role: Role};

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<any, any> {
    // Safe to inject: registered eagerly and has no dependency on persistence bootstrap.
    @Inject()
    private logger: Logger;

    @Inject()
    private jwtAuth: JwtAuthService;

    async check(action: Action<any, any>): Promise<AuthenticatedUser | null> {
        const id = await this.jwtAuth.verifyRequest(action.request);
        if (!id) {
            return null;
        }

        // Resolved lazily from the container instead of `@Inject()`-ed as a class field:
        // repository beans registered by `@nodeboot/starter-persistence` may not yet be
        // available in the container when authorization checkers are constructed.
        const userRepository = Container.has(UserRepository) ? Container.get(UserRepository) : undefined;
        const record = userRepository ? await userRepository.findOne({where: {id}}) : undefined;

        const role: Role = record?.roles.includes("admin")
            ? "admin"
            : record?.roles.includes("member")
            ? "member"
            : "user";

        const user: AuthenticatedUser = {id, roles: record?.roles ?? [], role};
        // Cache on the request so DefaultAuthorizationChecker can reuse it
        // instead of re-verifying the JWT and re-hitting the database.
        (action.request as any).user = user;
        return user;
    }
}
```

**`DefaultAuthorizationChecker.ts`** — the `AuthorizationChecker`, enforcing `@Authorized(roles)`:

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Container} from "typedi";
import {Logger} from "winston";
import {ForbiddenError, UnauthorizedError} from "@nodeboot/error";
import {UserRepository} from "../persistence/UserRepository";
import {AuthenticatedUser} from "./LoggedInUserResolver";
import {JwtAuthService, AUTH_HEADER} from "./JwtAuthService";

@Component()
export class DefaultAuthorizationChecker implements AuthorizationChecker<any, any> {
    @Inject()
    private logger: Logger;

    @Inject()
    private jwtAuth: JwtAuthService;

    async check(action: Action<any, any>, roles: string[]): Promise<boolean> {
        // Reuse the user cached by LoggedInUserResolver to avoid re-verifying the JWT.
        const cached = (action.request as any).user as AuthenticatedUser | undefined;
        const id = cached?.id ?? (await this.jwtAuth.verifyRequest(action.request));

        if (!id) {
            this.logger.warn(`Authorization denied: ${AUTH_HEADER} header is missing or invalid`);
            throw new UnauthorizedError(`A valid ${AUTH_HEADER} bearer token is required`);
        }

        // @Authorized() with no roles only requires a valid, authenticated caller.
        if (roles.length === 0) {
            return true;
        }

        const user = cached ?? (await this.resolveUser(id));
        if (!user) {
            throw new UnauthorizedError("User information could not be resolved");
        }

        if (!roles.includes(user.role)) {
            this.logger.warn(
                `Authorization denied for user ${user.id}: role '${user.role}' not in [${roles.join(", ")}]`,
            );
            throw new ForbiddenError(
                `User role '${user.role}' does not have access to this resource. Required roles: ${roles.join(", ")}`,
            );
        }

        return true;
    }

    private async resolveUser(id: string): Promise<AuthenticatedUser | null> {
        // Same lazy-resolution pattern as LoggedInUserResolver: don't `@Inject()` the
        // repository directly, fetch it from the container on demand instead.
        const userRepository = Container.has(UserRepository) ? Container.get(UserRepository) : undefined;
        const record = userRepository ? await userRepository.findOne({where: {id}}) : undefined;
        if (!record) {
            return {id, roles: [], role: "user"};
        }
        const role = record.roles.includes("admin") ? "admin" : record.roles.includes("member") ? "member" : "user";
        return {id, roles: record.roles, role};
    }
}
```

**Wiring it up** — register the JWKS/verify-options beans and enable authorization on the application:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootAppView, NodeBootApplication, Configuration, Bean} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableAuthorization} from "@nodeboot/authorization";
import {createRemoteJWKSet} from "jose";
import {LoggedInUserResolver} from "./auth/LoggedInUserResolver";
import {DefaultAuthorizationChecker} from "./auth/DefaultAuthorizationChecker";

@Configuration()
export class AuthConfiguration {
    @Bean("auth.jwks")
    jwks() {
        return createRemoteJWKSet(new URL(process.env.AUTH_JWKS_URI!));
    }

    @Bean("auth.jwtVerifyOptions")
    verifyOptions() {
        return {issuer: process.env.AUTH_ISSUER, audience: process.env.AUTH_AUDIENCE};
    }
}

@EnableDI(Container)
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationChecker)
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

**Using it in a controller:**

```typescript
import {Controller, Get, Post, Body} from "@nodeboot/core";
import {Authorized, CurrentUser} from "@nodeboot/authorization";
import {AuthenticatedUser} from "./auth/LoggedInUserResolver";

@Controller("/accounts", "v1")
export class AccountController {
    @Get("/me")
    @Authorized()
    async me(@CurrentUser({required: true}) user: AuthenticatedUser) {
        return user;
    }

    @Post("/")
    @Authorized(["admin"])
    async createAccount(@Body() body: {email: string}, @CurrentUser() createdBy: AuthenticatedUser) {
        return {createdBy: createdBy.id, ...body};
    }
}
```

---

### 2️⃣ Firebase Authentication (ID token verification via `@nodeboot/starter-firebase`)

If you already use [`@nodeboot/starter-firebase`](https://github.com/nodejs-boot/node-boot/tree/main/starters/firebase) for Firestore/Storage/etc., you can reuse the same Firebase Admin SDK to verify client-issued **ID tokens** and drive `@Authorized`/`@CurrentUser` from Firebase custom claims (e.g. `role: "admin"`).

**Enable Firebase alongside authorization:**

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootAppView, NodeBootApplication} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableFirebase} from "@nodeboot/starter-firebase";
import {EnableAuthorization} from "@nodeboot/authorization";
import {FirebaseUserResolver} from "./auth/FirebaseUserResolver";
import {FirebaseAuthorizationChecker} from "./auth/FirebaseAuthorizationChecker";

@EnableDI(Container)
@EnableFirebase()
@EnableAuthorization(FirebaseUserResolver, FirebaseAuthorizationChecker)
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

```yaml
# app-config.yaml
integrations:
    firebase:
        serviceAccount: "./firebase-service-account.json"
        projectId: "your-project-id"
```

**`FirebaseUserResolver.ts`** — verifies the `Authorization: Bearer <idToken>` header using the `firebase.auth` bean and maps Firebase custom claims to an application user:

```typescript
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {FIREBASE_AUTH_BEAN} from "@nodeboot/starter-firebase";
import {auth} from "firebase-admin";
import {Logger} from "winston";

export type FirebaseUser = {uid: string; email?: string; role: string};

@Component()
export class FirebaseUserResolver implements CurrentUserChecker<any, any> {
    @Inject(FIREBASE_AUTH_BEAN)
    private firebaseAuth: auth.Auth;

    @Inject()
    private logger: Logger;

    async check(action: Action<any, any>): Promise<FirebaseUser | null> {
        const header = action.request.headers?.authorization as string | undefined;
        const idToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
        if (!idToken) {
            return null;
        }

        try {
            // `checkRevoked: true` rejects tokens for users that were disabled/deleted
            // or whose sessions were revoked after the token was issued.
            const decoded = await this.firebaseAuth.verifyIdToken(idToken, true);
            const user: FirebaseUser = {
                uid: decoded.uid,
                email: decoded.email,
                // Custom claims (e.g. set via `firebaseAuth.setCustomUserClaims(uid, {role: "admin"})`)
                role: (decoded.role as string) ?? "user",
            };
            (action.request as any).user = user;
            return user;
        } catch (err) {
            this.logger.warn(`Rejected Firebase ID token: ${(err as Error).message}`);
            return null;
        }
    }
}
```

**`FirebaseAuthorizationChecker.ts`** — enforces `@Authorized(roles)` using the same cached user:

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {ForbiddenError, UnauthorizedError} from "@nodeboot/error";
import {FirebaseUser} from "./FirebaseUserResolver";

@Component()
export class FirebaseAuthorizationChecker implements AuthorizationChecker<any, any> {
    async check(action: Action<any, any>, roles: string[]): Promise<boolean> {
        const user = (action.request as any).user as FirebaseUser | undefined;
        if (!user) {
            throw new UnauthorizedError("A valid Firebase ID token is required");
        }

        if (roles.length === 0) {
            return true;
        }

        if (!roles.includes(user.role)) {
            throw new ForbiddenError(
                `User role '${user.role}' does not have access to this resource. Required roles: ${roles.join(", ")}`,
            );
        }

        return true;
    }
}
```

**Client-side context:** the frontend obtains an ID token via the Firebase client SDK (`getAuth().currentUser.getIdToken()`) and sends it as `Authorization: Bearer <idToken>` on every request. Because `FirebaseUserResolver.check()` returns `null` instead of throwing for a missing/invalid token, unauthenticated requests still reach the controller for routes that don't use `@Authorized()`/`@CurrentUser({required: true})` — useful for public endpoints that optionally personalize their response when a user happens to be logged in.

```typescript
import {Controller, Get} from "@nodeboot/core";
import {Authorized, CurrentUser} from "@nodeboot/authorization";
import {FirebaseUser} from "./auth/FirebaseUserResolver";

@Controller("/profile", "v1")
export class ProfileController {
    @Get("/")
    @Authorized()
    async profile(@CurrentUser({required: true}) user: FirebaseUser) {
        return user;
    }

    @Get("/admin/reports")
    @Authorized(["admin"])
    async adminReports() {
        return {reports: []};
    }
}
```

---

## 🧩 Common Issues

### `@Authorized` does nothing or fails at runtime

Make sure you enabled the package in your application:

```typescript
@EnableAuthorization(LoggedInUserResolver, DefaultAuthorizationResolver)
```

Without an authorization checker, protected routes cannot be evaluated.

### `Cannot use @Authorized decorator...`

This happens when `@Authorized(...)` is used but no authorization checker has been registered. The runtime throws `AuthorizationCheckerNotDefinedError`.

### `Cannot use @CurrentUser decorator...`

This happens when `@CurrentUser(...)` is used but no current-user checker has been registered. The runtime throws `CurrentUserCheckerNotDefinedError`.

### `@CurrentUser({required: true})` returns an authorization error

Your `CurrentUserChecker.check(action)` method returned `null`, `undefined`, or another empty value for the current request. Return a resolved user object when authentication succeeds.

### Roles are not enforced the way you expect

Remember that this package only captures decorator metadata. Your `AuthorizationChecker.check(action, roles)` implementation is responsible for interpreting roles and deciding whether access should be granted.

---

## ✅ Summary

`@nodeboot/authorization` is the authorization bridge for Node-Boot.

It gives you a clean decorator API for protecting routes and resolving the current user, while leaving the actual authentication and access-control rules in your own checker classes. If you want Spring-style authorization hooks in a Node-Boot app, this is the package that wires them in.
