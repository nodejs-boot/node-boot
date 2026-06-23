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
