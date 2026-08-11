---
name: nodeboot-starter-supabase
description: Use when the user wants Supabase integration in a Node-Boot app with `@nodeboot/starter-supabase`; this starter is enabled with `@EnableSupabase()` and registers an injectable `SupabaseClient` from `integrations.supabase` for auth, database, storage, and other Supabase API calls.
---

# `@nodeboot/starter-supabase`

Use this starter when the app should create one Supabase client from config and inject it anywhere. The starter reads `integrations.supabase`, chooses `serviceRoleKey` or `anonKey`, and builds the client with the configured auth/database options.

## Enable

```ts
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

## Key config

```yaml
integrations:
    supabase:
        url: "https://your-project.supabase.co"
        serviceRoleKey: "${SUPABASE_SERVICE_ROLE_KEY}"
        options:
            auth:
                autoRefreshToken: true
                persistSession: false
                detectSessionInUrl: false
            db:
                schema: "public"
```

Inject `SupabaseClient` directly into services or resolvers for queries, auth calls, or storage uploads.

Full docs: [`starters/supabase/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/supabase/README.md)

## Validate

`cd samples/sample-native-http-supabase && pnpm dev`
