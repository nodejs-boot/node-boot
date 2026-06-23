# Quick Start Guide - @nodeboot/starter-supabase

This guide will help you get up and running with Supabase in your Node-Boot application in just a few minutes.

## Prerequisites

-   A Supabase project ([Create one here](https://app.supabase.com/))
-   Node.js 16+ installed
-   A Node-Boot application set up

## Step 1: Install the Package

```bash
pnpm add @nodeboot/starter-supabase @supabase/supabase-js
```

or with npm:

```bash
npm install @nodeboot/starter-supabase @supabase/supabase-js
```

## Step 2: Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy your:
    - **Project URL** (e.g., `https://xxxxx.supabase.co`)
    - **anon/public key** (for client-side operations)
    - **service_role key** (for server-side operations - keep this secret!)

## Step 3: Configure Your Application

Create or update your `app-config.yaml`:

```yaml
integrations:
    supabase:
        url: "https://your-project.supabase.co"
        serviceRoleKey: "your-service-role-key"
        # For production, use environment variables:
        # url: "${SUPABASE_URL}"
        # serviceRoleKey: "${SUPABASE_SERVICE_ROLE_KEY}"
        options:
            auth:
                autoRefreshToken: true
                persistSession: false
            db:
                schema: "public"
```

## Step 4: Enable Supabase in Your Main Application

```typescript
import {EnableSupabase} from "@nodeboot/starter-supabase";
import {NodeBootApplication, NodeBootApp, NodeBoot} from "@nodeboot/core";
import {EnableDI, EnableComponentScan} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {Container} from "typedi";

@EnableDI(Container)
@EnableSupabase() // 👈 Add this decorator
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    async start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Step 5: Create Your First Service

```typescript
import {Service, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

@Service()
export class TodoService {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    async getAllTodos() {
        this.logger.info("Fetching all todos");

        const {data, error} = await this.supabase.from("todos").select("*").order("created_at", {ascending: false});

        if (error) {
            this.logger.error("Error fetching todos:", error);
            throw error;
        }

        return data;
    }

    async createTodo(title: string, description: string) {
        const {data, error} = await this.supabase.from("todos").insert({title, description}).select().single();

        if (error) {
            this.logger.error("Error creating todo:", error);
            throw error;
        }

        return data;
    }
}
```

## Step 6: Create a Simple Controller

```typescript
import {Controller, Get, Post, Inject} from "@nodeboot/core";
import {TodoService} from "./TodoService";

@Controller("/api/todos")
export class TodoController {
    constructor(private readonly todoService: TodoService) {}

    @Get("/")
    async getAllTodos() {
        return this.todoService.getAllTodos();
    }

    @Post("/")
    async createTodo({body}: any) {
        return this.todoService.createTodo(body.title, body.description);
    }
}
```

## Step 7: Run Your Application

```bash
pnpm start
```

Your Node-Boot application with Supabase is now running! 🚀

## Next Steps

-   **Database**: Create tables in your Supabase dashboard
-   **Authentication**: Implement user sign up/sign in
-   **Storage**: Add file upload functionality
-   **Realtime**: Subscribe to data changes
-   **Edge Functions**: Call serverless functions

## Common Use Cases

### User Authentication

```typescript
async signUp(email: string, password: string) {
    const {data, error} = await this.supabase.auth.signUp({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

async signIn(email: string, password: string) {
    const {data, error} = await this.supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}
```

### File Upload

```typescript
async uploadFile(bucket: string, fileName: string, file: Buffer) {
    const {data, error} = await this.supabase.storage
        .from(bucket)
        .upload(fileName, file);

    if (error) throw error;
    return data;
}
```

### Realtime Subscriptions

```typescript
this.supabase
    .channel("todos-channel")
    .on("postgres_changes", {event: "*", schema: "public", table: "todos"}, payload => {
        console.log("Change received!", payload);
    })
    .subscribe();
```

## Troubleshooting

### Error: "Supabase configuration is missing"

Make sure your `app-config.yaml` has the correct structure and the `integrations.supabase` section is properly configured.

### Error: "Supabase URL is missing"

Ensure you've added the `url` property in your configuration and it starts with `https://`.

### Error: "Supabase API key is missing"

You need to provide either `anonKey` or `serviceRoleKey` in your configuration.

### RLS Errors

If you're getting permission errors, make sure:

1. You're using the `serviceRoleKey` for server-side operations, OR
2. You've set up proper Row Level Security (RLS) policies if using `anonKey`

## Resources

-   [Full Documentation](./README.md)
-   [Usage Examples](./EXAMPLES.md)
-   [Supabase Documentation](https://supabase.com/docs)
-   [Node-Boot Documentation](https://github.com/nodejs-boot/node-boot)

## Support

If you encounter any issues:

1. Check the [examples](./EXAMPLES.md) for common patterns
2. Review the [Supabase docs](https://supabase.com/docs)
3. Open an issue on GitHub

Happy coding! 🎉
