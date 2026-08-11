# @nodeboot/starter-supabase Documentation

## Overview

`@nodeboot/starter-supabase` seamlessly integrates Supabase services into your Node.js application using the Node-Boot framework. Drawing inspiration from Spring Boot's auto-configuration, this package simplifies Supabase setup by:

-   **Auto-configuring Supabase Client**: Automatically initializes the Supabase client based on your configuration.
-   **Dependency Injection (DI) Support**: Provides a ready-to-use Supabase client instance as a bean in the DI container.
-   **Centralized Configuration**: Reads settings from an `app-config.yaml` file, promoting an opinionated and consistent configuration approach.

## Installation

Install the package via npm:

```bash
npm install @nodeboot/starter-supabase @supabase/supabase-js
```

Or using pnpm:

```bash
pnpm add @nodeboot/starter-supabase @supabase/supabase-js
```

## Configuration

To enable Supabase integration, add your Supabase settings to the `app-config.yaml` file under the `integrations.supabase` path.

### Example `app-config.yaml`:

```yaml
integrations:
    supabase:
        url: "https://your-project.supabase.co"
        serviceRoleKey: "your-service-role-key"
        # OR use anonKey for client-side operations
        # anonKey: "your-anon-key"
        options:
            auth:
                autoRefreshToken: true
                persistSession: false
                detectSessionInUrl: false
            db:
                schema: "public"
```

**Configuration Properties:**

-   `url` (string, **required**): The URL of your Supabase project. Find this in your [Supabase Dashboard](https://app.supabase.com/).
-   `serviceRoleKey` (string, optional): The service role API key for server-side operations with full access. This key bypasses Row Level Security (RLS) policies and should be kept secure.
-   `anonKey` (string, optional): The anonymous (public) API key for client-side operations with RLS policies. Safe to use in client-side code.
-   `options` (object, optional): Additional configuration options for the Supabase client.
    -   `auth`: Authentication configuration
        -   `autoRefreshToken` (boolean): Automatically refresh tokens before expiry (default: `true`)
        -   `persistSession` (boolean): Persist session in storage (default: `false` for server-side)
        -   `detectSessionInUrl` (boolean): Detect sessions from URL (default: `false` for server-side)
        -   `storageKey` (string): Custom storage key prefix (default: `"sb"`)
    -   `db`: Database configuration
        -   `schema` (string): Database schema to use (default: `"public"`)
    -   `realtime`: Realtime subscription configuration
    -   `global`: Global configuration
        -   `headers` (object): Global headers for all requests

**Note:** You must provide either `serviceRoleKey` (for server-side with full access) or `anonKey` (for client-side with RLS policies).

## Enabling Supabase Integration

In your main application class, apply the `@EnableSupabase` decorator to activate Supabase auto-configuration:

```typescript
import {EnableSupabase} from "@nodeboot/starter-supabase";
import {NodeBootApplication, NodeBootApp} from "@nodeboot/core";
import {EnableDI, EnableComponentScan} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {Container} from "typedi";

@EnableDI(Container)
@EnableSupabase()
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<void> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Accessing Supabase Client

With auto-configuration enabled, you can inject the Supabase client into your components using the DI container.

### Example Service:

```typescript
import {Service, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

@Service()
export class UserService {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    public async getAllUsers() {
        this.logger.info("Fetching all users from Supabase...");

        try {
            const {data, error} = await this.supabase.from("users").select("*");

            if (error) {
                this.logger.error("Error fetching users:", error);
                throw error;
            }

            this.logger.info(`Retrieved ${data?.length || 0} users.`);
            return data;
        } catch (error) {
            this.logger.error("Error in getAllUsers:", error);
            throw error;
        }
    }

    public async createUser(email: string, password: string) {
        this.logger.info(`Creating user with email: ${email}`);

        try {
            const {data, error} = await this.supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                this.logger.error("Error creating user:", error);
                throw error;
            }

            this.logger.info(`User created successfully: ${data.user?.id}`);
            return data;
        } catch (error) {
            this.logger.error("Error in createUser:", error);
            throw error;
        }
    }
}
```

### Example Storage Service:

```typescript
import {Service, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

@Service()
export class StorageService {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    public async uploadFile(bucket: string, path: string, file: Buffer) {
        this.logger.info(`Uploading file to bucket: ${bucket}/${path}`);

        try {
            const {data, error} = await this.supabase.storage.from(bucket).upload(path, file);

            if (error) {
                this.logger.error("Error uploading file:", error);
                throw error;
            }

            this.logger.info(`File uploaded successfully: ${data.path}`);
            return data;
        } catch (error) {
            this.logger.error("Error in uploadFile:", error);
            throw error;
        }
    }

    public async getPublicUrl(bucket: string, path: string) {
        const {data} = this.supabase.storage.from(bucket).getPublicUrl(path);

        return data.publicUrl;
    }
}
```

---

## 🔐 Authorization in Node-Boot Controllers with Supabase Auth

`@nodeboot/starter-supabase` doesn't ship a dedicated `SupabaseAuth` decorator/class — Supabase Auth is exposed through the same `SUPABASE_CLIENT_BEAN` (`supabase.auth.*`) already used elsewhere in this package. To protect Node-Boot controllers, you compose that client with **[`@nodeboot/authorization`](https://github.com/nodejs-boot/node-boot/tree/main/packages/authorization)**, the same way you would for JWT- or Firebase-based auth: implement a `CurrentUserChecker` and an `AuthorizationChecker` that call `supabase.auth.getUser(...)` under the hood, then use `@Authorized()` / `@CurrentUser()` on your controllers as usual.

### 1️⃣ Install `@nodeboot/authorization`

```sh
pnpm add @nodeboot/authorization
```

### 2️⃣ How the flow works

1. The frontend signs the user in with the Supabase client SDK (`supabase.auth.signInWithPassword(...)`, OAuth, magic link, etc.) and obtains a **Supabase access token** (a JWT).
2. Every subsequent request to your Node-Boot API sends that token as a standard bearer token: `Authorization: Bearer <supabase-access-token>`.
3. A `CurrentUserChecker` extracts the token and calls `supabase.auth.getUser(token)` — this asks Supabase's Auth server to validate the token and return the corresponding user record, so you never need to manage JWT secrets or JWKS yourself.
4. An `AuthorizationChecker` reuses that resolved user (cached on the request) to enforce `@Authorized(roles)`, reading the role from Supabase custom claims (`user.app_metadata` / `user.user_metadata`) or from your own `profiles`/`users` table.

### 3️⃣ `SupabaseUserResolver` — the `CurrentUserChecker`

```typescript
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

export type SupabaseUser = {id: string; email?: string; role: string};

const BEARER_PREFIX = "Bearer ";

@Component()
export class SupabaseUserResolver implements CurrentUserChecker<any, any> {
    @Inject(SUPABASE_CLIENT_BEAN)
    private supabase: SupabaseClient;

    @Inject()
    private logger: Logger;

    async check(action: Action<any, any>): Promise<SupabaseUser | null> {
        const header = action.request.headers?.authorization as string | undefined;
        const accessToken = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length).trim() : undefined;
        if (!accessToken) {
            return null;
        }

        // Asks Supabase's Auth server to verify the token and return the user.
        // No JWT secret / JWKS management required on your side.
        const {data, error} = await this.supabase.auth.getUser(accessToken);
        if (error || !data.user) {
            this.logger.warn(`Rejected Supabase access token: ${error?.message ?? "user not found"}`);
            return null;
        }

        // Roles are typically stored in `app_metadata` (only settable server-side,
        // safe from tampering by the client) via Supabase custom claims / a database trigger.
        const role = (data.user.app_metadata?.role as string) ?? "user";

        const user: SupabaseUser = {id: data.user.id, email: data.user.email, role};
        (action.request as any).user = user;
        return user;
    }
}
```

### 4️⃣ `SupabaseAuthorizationChecker` — the `AuthorizationChecker`

```typescript
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {ForbiddenError, UnauthorizedError} from "@nodeboot/error";
import {SupabaseUser} from "./SupabaseUserResolver";

@Component()
export class SupabaseAuthorizationChecker implements AuthorizationChecker<any, any> {
    async check(action: Action<any, any>, roles: string[]): Promise<boolean> {
        // Reuses the user cached by SupabaseUserResolver to avoid calling
        // supabase.auth.getUser(...) a second time for the same request.
        const user = (action.request as any).user as SupabaseUser | undefined;
        if (!user) {
            throw new UnauthorizedError("A valid Supabase access token is required");
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

### 5️⃣ Wire it up alongside `@EnableSupabase()`

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootAppView, NodeBootApplication} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableSupabase} from "@nodeboot/starter-supabase";
import {EnableAuthorization} from "@nodeboot/authorization";
import {SupabaseUserResolver} from "./auth/SupabaseUserResolver";
import {SupabaseAuthorizationChecker} from "./auth/SupabaseAuthorizationChecker";

@EnableDI(Container)
@EnableSupabase()
@EnableAuthorization(SupabaseUserResolver, SupabaseAuthorizationChecker)
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

### 6️⃣ Protect controllers with `@Authorized` / `@CurrentUser`

```typescript
import {Controller, Get, Post, Body} from "@nodeboot/core";
import {Authorized, CurrentUser} from "@nodeboot/authorization";
import {SupabaseUser} from "./auth/SupabaseUserResolver";

@Controller("/profile", "v1")
export class ProfileController {
    @Get("/me")
    @Authorized()
    async me(@CurrentUser({required: true}) user: SupabaseUser) {
        return user;
    }
}

@Controller("/admin", "v1")
export class AdminController {
    @Get("/reports")
    @Authorized(["admin"])
    async reports() {
        return {reports: []};
    }
}
```

### Setting roles/custom claims in Supabase

`app_metadata` can only be modified server-side (e.g. via the Admin API using the `serviceRoleKey`, or a Postgres trigger/function), which is what makes it safe to use for authorization — unlike `user_metadata`, which the signed-in user can update themselves.

```typescript
// One-off/admin script using the service-role client
await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {role: "admin"},
});
```

### Respecting Row Level Security for data access (advanced)

The resolver above uses the shared `SUPABASE_CLIENT_BEAN`, which is usually configured with the `serviceRoleKey` and therefore **bypasses RLS** for any `.from(table)` calls made with it. If a specific controller/service should query data **as the authenticated user** (so your existing RLS policies are enforced), create a short-lived, per-request Supabase client scoped to that user's access token instead of reusing the shared bean:

```typescript
import {createClient} from "@supabase/supabase-js";

function createUserScopedClient(supabaseUrl: string, supabaseAnonKey: string, accessToken: string) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {headers: {Authorization: `Bearer ${accessToken}`}},
        auth: {autoRefreshToken: false, persistSession: false},
    });
}
```

Use the anon key (not the service role key) for this client so Postgres evaluates RLS policies using `auth.uid()` from the forwarded token, exactly as Supabase's own client libraries do.

---

## Available Supabase Features

The Supabase client provides access to all Supabase services:

-   **Database**: PostgreSQL database with auto-generated APIs
    ```typescript
    await this.supabase.from("table_name").select("*");
    ```
-   **Authentication**: User authentication and authorization
    ```typescript
    await this.supabase.auth.signUp({email, password});
    ```
-   **Storage**: File storage and retrieval
    ```typescript
    await this.supabase.storage.from("bucket").upload(path, file);
    ```
-   **Realtime**: Real-time data subscriptions
    ```typescript
    this.supabase.channel("table-changes").on("postgres_changes", {...}).subscribe();
    ```
-   **Edge Functions**: Invoke serverless functions
    ```typescript
    await this.supabase.functions.invoke("function-name", {body: {...}});
    ```

> ℹ️ All of the above go through Supabase's **PostgREST** layer (or the Auth/Storage/Realtime/Functions services sitting in front of it) — not a direct SQL connection. `.from("table").select(...)` issues an HTTP request to PostgREST, which then queries Postgres on your behalf and enforces Row Level Security unless you're using the `serviceRoleKey`. This is fine for most application code, but it means you don't get a TypeORM `DataSource`, entities, migrations, or query builder from this package alone — see the next section if you need that.

## Connecting Node-Boot to the Underlying Supabase Postgres Database Directly

Every Supabase project **is** a full Postgres database — `@nodeboot/starter-supabase` just doesn't expose a direct SQL connection to it, only the PostgREST-backed client shown above. If your application needs TypeORM entities, repositories, migrations, transactions, or raw SQL against that same database (e.g. for complex joins/reporting queries that are awkward through PostgREST, or to share entity definitions with other Node-Boot services), pair this starter with **[`@nodeboot/starter-persistence`](https://github.com/nodejs-boot/node-boot/tree/main/starters/persistence)**, using TypeORM's `postgres` driver pointed at the connection details from your Supabase project.

### 1️⃣ Get your Postgres connection details from Supabase

In the Supabase Dashboard, go to **Settings → Database → Connection string / Connection info** and note:

-   **Host** — e.g. `db.<project-ref>.supabase.co` (direct connection) or the **Connection Pooler** host (e.g. `aws-0-<region>.pooler.supabase.com`) if you want pooled connections.
-   **Port** — `5432` for a direct connection, `6543` for the pooler (PgBouncer).
-   **Database** — `postgres` by default.
-   **User** — `postgres` (direct) or `postgres.<project-ref>` (pooler).
-   **Password** — the database password you set when creating the project (not your Supabase account password, and not the `anonKey`/`serviceRoleKey`).

> Prefer the **connection pooler** (port `6543`) for serverless/short-lived environments or when you expect many concurrent connections, since Supabase's direct Postgres connection limit is comparatively low. Use the **direct connection** (port `5432`) for long-running servers where you want session-level features (e.g. `LISTEN`/`NOTIFY`, prepared statements) that PgBouncer's transaction-pooling mode doesn't support.

### 2️⃣ Install and enable the persistence starter alongside Supabase

```sh
pnpm add @nodeboot/starter-persistence typeorm pg
```

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootAppView, NodeBootApplication} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableSupabase} from "@nodeboot/starter-supabase";
import {EnableRepositories} from "@nodeboot/starter-persistence";

@EnableDI(Container)
@EnableSupabase() // Supabase client: Auth, Storage, Realtime, Edge Functions
@EnableRepositories() // TypeORM: direct SQL access to the same Postgres database
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

### 3️⃣ Configure both integrations in `app-config.yaml`

```yaml
integrations:
    supabase:
        url: "${SUPABASE_URL}"
        serviceRoleKey: "${SUPABASE_SERVICE_ROLE_KEY}"

persistence:
    type: "postgres"
    synchronize: false
    logging:
        - "error"
        - "warn"
    postgres:
        # Use the pooler host/port for serverless or high-concurrency workloads,
        # or the direct db.<project-ref>.supabase.co:5432 host for long-running servers.
        host: "${SUPABASE_DB_HOST}" # e.g. aws-0-us-east-1.pooler.supabase.com
        port: 6543
        username: "${SUPABASE_DB_USER}" # e.g. postgres.<project-ref>
        password: "${SUPABASE_DB_PASSWORD}"
        database: "postgres"
        ssl:
            rejectUnauthorized: false
```

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_HOST=aws-0-us-east-1.pooler.supabase.com
SUPABASE_DB_USER=postgres.your-project-ref
SUPABASE_DB_PASSWORD=your-database-password
```

> **TLS is required.** Supabase's Postgres endpoints only accept encrypted connections, so `ssl` must be configured (at minimum `{rejectUnauthorized: false}` since Supabase uses a certificate that Node's default trust store may not validate; for stricter setups, supply Supabase's CA certificate via `ssl.ca` instead of disabling verification).

### 4️⃣ Define entities and repositories against the same database

Once `@EnableRepositories()` is active, you use `@nodeboot/starter-persistence` exactly as documented in its own README — TypeORM `@Entity()` classes, `@DataRepository(...)` repositories, `@Transactional()`, migrations, etc. — all against the same underlying Postgres database that also backs your Supabase project's PostgREST/Auth/Storage/Realtime services.

```typescript
import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity({name: "todos"}) // same table Supabase's PostgREST/Realtime already expose
export class Todo {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    title: string;

    @Column({nullable: true})
    description?: string;
}
```

```typescript
import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {Todo} from "../entities/Todo";

@DataRepository(Todo)
export class TodoRepository extends Repository<Todo> {}
```

```typescript
import {Service} from "@nodeboot/core";
import {TodoRepository} from "../persistence/TodoRepository";

@Service()
export class TodoService {
    constructor(private readonly todoRepository: TodoRepository) {}

    findAll() {
        return this.todoRepository.find({order: {title: "ASC"}});
    }
}
```

### Things to be aware of

-   **Row Level Security (RLS) is bypassed.** A direct TypeORM/`postgres` connection uses your database credentials, not the `anonKey`/`serviceRoleKey`, so Postgres RLS policies (designed around Supabase's `auth.uid()` and PostgREST roles) do **not** apply the same way to raw SQL connections. Treat this connection like any other trusted server-side database credential.
-   **Don't let both `synchronize: true` (TypeORM) and Supabase's dashboard/migrations manage the same schema.** Pick one source of truth for schema changes — either TypeORM migrations (`@Migration()` + `persistence.migrationsRun: true`) or Supabase's own migration tooling/dashboard — to avoid the two drifting out of sync.
-   **PgBouncer transaction-pooling mode** (port `6543`) does not support session-level Postgres features (prepared statement reuse across queries, `LISTEN`/`NOTIFY`, advisory locks held across statements). If you need those, connect on port `5432` (direct) or use the pooler's **session mode** instead.
-   **Realtime subscriptions still go through the Supabase client**, not TypeORM — `@EnableRepositories()` only gives you SQL access; keep using `@nodeboot/starter-supabase`'s `SUPABASE_CLIENT_BEAN` for `postgres_changes` subscriptions, Auth, Storage, and Edge Functions.

---

## Logging

The package utilizes a logger to provide informative messages during the initialization and injection of the Supabase client.

If the configuration is missing or incorrect, the initialization will log an error:

```
No configuration provided for Supabase integration.
Please configure "integrations.supabase" in the app-config.yaml with at least "url" and "anonKey" or "serviceRoleKey".
```

Ensure that your `app-config.yaml` is correctly set up with the required fields.

## Security Best Practices

-   **Server-Side**: Use `serviceRoleKey` for server-side operations. This key has full access and bypasses RLS policies.
-   **Client-Side**: Use `anonKey` for client-side operations and implement Row Level Security (RLS) policies to protect your data.
-   **Environment Variables**: Store sensitive keys in environment variables, not in committed configuration files.
-   **RLS Policies**: Always implement Row Level Security policies in your Supabase database to control access to data.

## Conclusion

`@nodeboot/starter-supabase` streamlines the integration of Supabase services into your Node.js application by leveraging Node-Boot's auto-configuration and DI capabilities. With minimal setup, you can access and utilize Supabase's powerful features including database, authentication, storage, and realtime subscriptions.

For more detailed information on Supabase features, refer to the official [Supabase Documentation](https://supabase.com/docs).

## Resources

-   [Supabase Documentation](https://supabase.com/docs)
-   [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
-   [Supabase Authentication](https://supabase.com/docs/guides/auth)
-   [Supabase Database](https://supabase.com/docs/guides/database)
-   [Supabase Storage](https://supabase.com/docs/guides/storage)
-   [Supabase Realtime](https://supabase.com/docs/guides/realtime)
