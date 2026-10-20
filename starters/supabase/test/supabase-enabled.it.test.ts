/**
 * Auto-configuration integration test for `@nodeboot/starter-supabase`.
 *
 * No negative counterpart here - see the note in `SupabaseEnabledApp`'s doc comment for why.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {SupabaseClient} from "@supabase/supabase-js";
import {useNodeBoot} from "@nodeboot/node-test";
import {SupabaseEnabledApp} from "./fixtures/SupabaseEnabledApp";
import {ApplicationContext} from "@nodeboot/context";

describe("@nodeboot/starter-supabase auto-configuration - integrations.supabase configured", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(SupabaseEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-supabase-enabled-test"},
            integrations: {
                supabase: {
                    url: "https://example.supabase.co",
                    anonKey: "test-anon-key",
                },
            },
        });
    });

    test("registers a real SupabaseClient configured with the URL from app-config", () => {
        // `@nodeboot/node-test`'s own `useService()` resolves against a different (published)
        // `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from the running app's IoC container.
        const client = ApplicationContext.getIocContainer()!.get(SupabaseClient);

        assert.ok(client instanceof SupabaseClient);
        assert.equal((client as any).supabaseUrl, "https://example.supabase.co");
        assert.equal((client as any).supabaseKey, "test-anon-key");
    });
});
