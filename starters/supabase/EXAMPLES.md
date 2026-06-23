# Supabase Starter - Usage Examples

This document provides practical examples of using the `@nodeboot/starter-supabase` package in your Node-Boot application.

## Setup

### 1. Install Dependencies

```bash
pnpm add @nodeboot/starter-supabase @supabase/supabase-js
```

### 2. Configure app-config.yaml

```yaml
integrations:
    supabase:
        url: "https://your-project.supabase.co"
        serviceRoleKey: "${SUPABASE_SERVICE_ROLE_KEY}"
        options:
            auth:
                autoRefreshToken: true
                persistSession: false
            db:
                schema: "public"
```

### 3. Enable Supabase in Your Application

```typescript
import {EnableSupabase} from "@nodeboot/starter-supabase";
import {NodeBootApplication, NodeBootApp, NodeBoot} from "@nodeboot/core";
import {EnableDI, EnableComponentScan} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {Container} from "typedi";

@EnableDI(Container)
@EnableSupabase()
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    async start() {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Example 1: User Management Service

```typescript
import {Service, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

interface User {
    id: string;
    email: string;
    created_at: string;
}

@Service()
export class UserService {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    async createUser(email: string, password: string) {
        this.logger.info(`Creating user: ${email}`);

        const {data, error} = await this.supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            this.logger.error("Error creating user:", error);
            throw error;
        }

        return data;
    }

    async getUserById(userId: string): Promise<User | null> {
        const {data, error} = await this.supabase.from("users").select("*").eq("id", userId).single();

        if (error) {
            this.logger.error(`Error fetching user ${userId}:`, error);
            throw error;
        }

        return data;
    }

    async getAllUsers(): Promise<User[]> {
        const {data, error} = await this.supabase.from("users").select("*").order("created_at", {ascending: false});

        if (error) {
            this.logger.error("Error fetching users:", error);
            throw error;
        }

        return data || [];
    }

    async updateUser(userId: string, updates: Partial<User>) {
        const {data, error} = await this.supabase.from("users").update(updates).eq("id", userId).select().single();

        if (error) {
            this.logger.error(`Error updating user ${userId}:`, error);
            throw error;
        }

        return data;
    }

    async deleteUser(userId: string) {
        const {error} = await this.supabase.from("users").delete().eq("id", userId);

        if (error) {
            this.logger.error(`Error deleting user ${userId}:`, error);
            throw error;
        }

        this.logger.info(`User ${userId} deleted successfully`);
    }
}
```

## Example 2: File Storage Service

```typescript
import {Service, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

@Service()
export class FileStorageService {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    async uploadFile(bucket: string, path: string, file: Buffer, contentType?: string) {
        this.logger.info(`Uploading file to ${bucket}/${path}`);

        const {data, error} = await this.supabase.storage.from(bucket).upload(path, file, {
            contentType,
            upsert: false,
        });

        if (error) {
            this.logger.error("Error uploading file:", error);
            throw error;
        }

        this.logger.info(`File uploaded successfully: ${data.path}`);
        return data;
    }

    async downloadFile(bucket: string, path: string) {
        this.logger.info(`Downloading file from ${bucket}/${path}`);

        const {data, error} = await this.supabase.storage.from(bucket).download(path);

        if (error) {
            this.logger.error("Error downloading file:", error);
            throw error;
        }

        return data;
    }

    async getPublicUrl(bucket: string, path: string): string {
        const {data} = this.supabase.storage.from(bucket).getPublicUrl(path);

        return data.publicUrl;
    }

    async createSignedUrl(bucket: string, path: string, expiresIn: number = 3600) {
        const {data, error} = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

        if (error) {
            this.logger.error("Error creating signed URL:", error);
            throw error;
        }

        return data;
    }

    async deleteFile(bucket: string, path: string) {
        const {error} = await this.supabase.storage.from(bucket).remove([path]);

        if (error) {
            this.logger.error("Error deleting file:", error);
            throw error;
        }

        this.logger.info(`File deleted successfully: ${bucket}/${path}`);
    }

    async listFiles(bucket: string, path: string = "") {
        const {data, error} = await this.supabase.storage.from(bucket).list(path);

        if (error) {
            this.logger.error("Error listing files:", error);
            throw error;
        }

        return data;
    }
}
```

## Example 3: Realtime Subscriptions

```typescript
import {Service, Inject, PostConstruct, PreDestroy} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient, RealtimeChannel} from "@supabase/supabase-js";
import {Logger} from "winston";

@Service()
export class RealtimeService {
    private channel?: RealtimeChannel;

    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    @PostConstruct()
    async initialize() {
        this.logger.info("Initializing realtime subscriptions");
        this.subscribeToUserChanges();
    }

    private subscribeToUserChanges() {
        this.channel = this.supabase
            .channel("users-changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "users",
                },
                payload => {
                    this.logger.info("User change detected:", payload);
                    this.handleUserChange(payload);
                },
            )
            .subscribe(status => {
                this.logger.info(`Subscription status: ${status}`);
            });
    }

    private handleUserChange(payload: any) {
        const {eventType, new: newRecord, old: oldRecord} = payload;

        switch (eventType) {
            case "INSERT":
                this.logger.info("New user created:", newRecord);
                break;
            case "UPDATE":
                this.logger.info("User updated:", {old: oldRecord, new: newRecord});
                break;
            case "DELETE":
                this.logger.info("User deleted:", oldRecord);
                break;
        }
    }

    @PreDestroy()
    async cleanup() {
        if (this.channel) {
            await this.supabase.removeChannel(this.channel);
            this.logger.info("Realtime subscription cleaned up");
        }
    }
}
```

## Example 4: REST API Controller

```typescript
import {Controller, Get, Post, Put, Delete, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

@Controller("/api/posts")
export class PostsController {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    @Get("/")
    async getAllPosts() {
        const {data, error} = await this.supabase
            .from("posts")
            .select("*, author:users(id, email)")
            .order("created_at", {ascending: false});

        if (error) {
            this.logger.error("Error fetching posts:", error);
            throw error;
        }

        return {posts: data, count: data?.length || 0};
    }

    @Get("/:id")
    async getPostById({params}: any) {
        const {data, error} = await this.supabase
            .from("posts")
            .select("*, author:users(id, email)")
            .eq("id", params.id)
            .single();

        if (error) {
            this.logger.error(`Error fetching post ${params.id}:`, error);
            throw error;
        }

        return data;
    }

    @Post("/")
    async createPost({body}: any) {
        const {data, error} = await this.supabase
            .from("posts")
            .insert({
                title: body.title,
                content: body.content,
                author_id: body.authorId,
            })
            .select()
            .single();

        if (error) {
            this.logger.error("Error creating post:", error);
            throw error;
        }

        return data;
    }

    @Put("/:id")
    async updatePost({params, body}: any) {
        const {data, error} = await this.supabase
            .from("posts")
            .update({
                title: body.title,
                content: body.content,
            })
            .eq("id", params.id)
            .select()
            .single();

        if (error) {
            this.logger.error(`Error updating post ${params.id}:`, error);
            throw error;
        }

        return data;
    }

    @Delete("/:id")
    async deletePost({params}: any) {
        const {error} = await this.supabase.from("posts").delete().eq("id", params.id);

        if (error) {
            this.logger.error(`Error deleting post ${params.id}:`, error);
            throw error;
        }

        return {message: "Post deleted successfully"};
    }
}
```

## Example 5: Edge Functions Integration

```typescript
import {Service, Inject} from "@nodeboot/core";
import {SUPABASE_CLIENT_BEAN} from "@nodeboot/starter-supabase";
import {SupabaseClient} from "@supabase/supabase-js";
import {Logger} from "winston";

@Service()
export class EdgeFunctionsService {
    constructor(
        private readonly logger: Logger,
        @Inject(SUPABASE_CLIENT_BEAN)
        private readonly supabase: SupabaseClient,
    ) {}

    async sendWelcomeEmail(userId: string, email: string) {
        this.logger.info(`Sending welcome email to ${email}`);

        const {data, error} = await this.supabase.functions.invoke("send-welcome-email", {
            body: {
                userId,
                email,
            },
        });

        if (error) {
            this.logger.error("Error invoking edge function:", error);
            throw error;
        }

        return data;
    }

    async processPayment(orderId: string, amount: number) {
        const {data, error} = await this.supabase.functions.invoke("process-payment", {
            body: {
                orderId,
                amount,
            },
        });

        if (error) {
            this.logger.error("Error processing payment:", error);
            throw error;
        }

        return data;
    }
}
```

## Testing

Here's an example of how to test a service that uses Supabase:

```typescript
import {describe, it, beforeEach} from "node:test";
import {strict as assert} from "node:assert";
import {UserService} from "./UserService";

describe("UserService", () => {
    let userService: UserService;
    let mockSupabase: any;
    let mockLogger: any;

    beforeEach(() => {
        mockLogger = {
            info: () => {},
            error: () => {},
        };

        mockSupabase = {
            from: (table: string) => ({
                select: () => ({
                    eq: () => ({
                        single: async () => ({
                            data: {id: "1", email: "test@example.com"},
                            error: null,
                        }),
                    }),
                }),
            }),
        };

        userService = new UserService(mockLogger, mockSupabase);
    });

    it("should get user by id", async () => {
        const user = await userService.getUserById("1");
        assert.equal(user.email, "test@example.com");
    });
});
```

## Environment Variables

For better security, use environment variables for sensitive data:

```yaml
# app-config.yaml
integrations:
    supabase:
        url: "${SUPABASE_URL}"
        serviceRoleKey: "${SUPABASE_SERVICE_ROLE_KEY}"
```

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Best Practices

1. **Use Service Role Key Server-Side**: Always use the service role key for server-side operations where you need full access.

2. **Implement Row Level Security (RLS)**: When using the anon key, always implement RLS policies in your Supabase database.

3. **Error Handling**: Always handle errors from Supabase operations and log them appropriately.

4. **Type Safety**: Define TypeScript interfaces for your database tables to ensure type safety.

5. **Connection Pooling**: Supabase client handles connection pooling automatically, so you don't need to worry about it.

6. **Cleanup**: Use `@PreDestroy` to cleanup resources like realtime subscriptions when the service is destroyed.
