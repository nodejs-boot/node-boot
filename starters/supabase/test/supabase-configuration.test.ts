import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {SupabaseClient} from "@supabase/supabase-js";
import {SupabaseConfiguration} from "../src/configuration/SupabaseConfiguration";
import {EnableSupabase} from "../src";

function createMockBeansContext(configMap: Record<string, any> = {}) {
    const logs: {level: string; message: string}[] = [];
    return {
        context: {
            logger: {
                info: (msg: string) => logs.push({level: "info", message: msg}),
                error: (msg: string) => logs.push({level: "error", message: msg}),
                warn: (msg: string) => logs.push({level: "warn", message: msg}),
                debug: (msg: string) => logs.push({level: "debug", message: msg}),
            } as any,
            config: {
                get: <T>(path: string): T | undefined => configMap[path],
            } as any,
        },
        logs,
    };
}

describe("@nodeboot/starter-supabase SupabaseConfiguration unit & auto-config tests", () => {
    test("throws an error when integrations.supabase is completely missing", () => {
        const config = new SupabaseConfiguration();
        const {context, logs} = createMockBeansContext({});

        assert.throws(
            () => {
                config.supabaseClient(context as any);
            },
            (err: any) => {
                assert.match(err.message, /Supabase configuration is missing/);
                return true;
            },
        );

        assert.ok(
            logs.some(
                l => l.level === "error" && l.message.includes("No configuration provided for Supabase integration"),
            ),
        );
    });

    test("throws an error when integrations.supabase.url is missing or empty", () => {
        const config = new SupabaseConfiguration();
        const {context, logs} = createMockBeansContext({
            "integrations.supabase": {
                anonKey: "anon-key-without-url",
            },
        });

        assert.throws(
            () => {
                config.supabaseClient(context as any);
            },
            (err: any) => {
                assert.match(err.message, /Supabase URL is missing/);
                return true;
            },
        );

        assert.ok(logs.some(l => l.level === "error" && l.message.includes("Supabase URL is required")));
    });

    test("throws an error when neither serviceRoleKey nor anonKey is provided", () => {
        const config = new SupabaseConfiguration();
        const {context, logs} = createMockBeansContext({
            "integrations.supabase": {
                url: "https://my-test-project.supabase.co",
            },
        });

        assert.throws(
            () => {
                config.supabaseClient(context as any);
            },
            (err: any) => {
                assert.match(err.message, /Supabase API key is missing/);
                return true;
            },
        );

        assert.ok(logs.some(l => l.level === "error" && l.message.includes("Supabase API key is required")));
    });

    test("configures SupabaseClient successfully using serviceRoleKey", () => {
        const config = new SupabaseConfiguration();
        const {context, logs} = createMockBeansContext({
            "integrations.supabase": {
                url: "https://my-test-project.supabase.co",
                serviceRoleKey: "my-service-role-key-12345",
            },
        });

        const client = config.supabaseClient(context as any);

        assert.ok(client instanceof SupabaseClient);
        assert.equal((client as any).supabaseUrl, "https://my-test-project.supabase.co");
        assert.equal((client as any).supabaseKey, "my-service-role-key-12345");
        assert.ok(logs.some(l => l.level === "info" && l.message.includes("using service role key")));
    });

    test("configures SupabaseClient successfully using anonKey", () => {
        const config = new SupabaseConfiguration();
        const {context, logs} = createMockBeansContext({
            "integrations.supabase": {
                url: "https://my-test-project.supabase.co",
                anonKey: "my-anon-key-67890",
            },
        });

        const client = config.supabaseClient(context as any);

        assert.ok(client instanceof SupabaseClient);
        assert.equal((client as any).supabaseUrl, "https://my-test-project.supabase.co");
        assert.equal((client as any).supabaseKey, "my-anon-key-67890");
        assert.ok(logs.some(l => l.level === "info" && l.message.includes("using anon key")));
    });

    test("prefers serviceRoleKey over anonKey when both are provided", () => {
        const config = new SupabaseConfiguration();
        const {context, logs} = createMockBeansContext({
            "integrations.supabase": {
                url: "https://my-test-project.supabase.co",
                serviceRoleKey: "preferred-service-key",
                anonKey: "fallback-anon-key",
            },
        });

        const client = config.supabaseClient(context as any);

        assert.ok(client instanceof SupabaseClient);
        assert.equal((client as any).supabaseKey, "preferred-service-key");
        assert.ok(logs.some(l => l.level === "info" && l.message.includes("using service role key")));
    });

    test("configures all custom options (auth, db schema, realtime, global headers)", () => {
        const config = new SupabaseConfiguration();
        const {context} = createMockBeansContext({
            "integrations.supabase": {
                url: "https://my-test-project.supabase.co",
                anonKey: "custom-options-key",
                options: {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: true,
                        detectSessionInUrl: true,
                        storageKey: "my_custom_storage_key",
                    },
                    db: {
                        schema: "custom_schema",
                    },
                    realtime: {
                        params: {eventsPerSecond: 10},
                    },
                    global: {
                        headers: {"X-Custom-Header": "NodeBootValue"},
                    },
                },
            },
        });

        const client = config.supabaseClient(context as any);

        assert.ok(client instanceof SupabaseClient);
        assert.equal((client as any).supabaseUrl, "https://my-test-project.supabase.co");
        assert.equal((client as any).supabaseKey, "custom-options-key");
        assert.ok(client.auth);
        assert.ok(client.realtime);
        assert.ok(client.storage);
        assert.ok(client.functions);
    });

    test("configures SupabaseClient with default options when options is omitted", () => {
        const config = new SupabaseConfiguration();
        const {context} = createMockBeansContext({
            "integrations.supabase": {
                url: "https://my-test-project.supabase.co",
                anonKey: "defaults-anon-key",
            },
        });

        const client = config.supabaseClient(context as any);

        assert.ok(client instanceof SupabaseClient);
        assert.equal((client as any).supabaseUrl, "https://my-test-project.supabase.co");
        assert.equal((client as any).supabaseKey, "defaults-anon-key");
    });

    test("@EnableSupabase decorator instantiates SupabaseConfiguration", () => {
        const decorator = EnableSupabase();
        assert.equal(typeof decorator, "function");

        class DummyTargetClass {}
        // Applying the decorator invokes the constructor of SupabaseConfiguration
        decorator(DummyTargetClass);
    });
});
