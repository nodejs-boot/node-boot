/**
 * Integration test verifying DI injection of `SupabaseClient` into `@Service()` components.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SupabaseClient} from "@supabase/supabase-js";
import {useNodeBoot} from "@nodeboot/node-test";
import {SupabaseServiceApp} from "./fixtures/SupabaseServiceApp";
import {SampleSupabaseService} from "./fixtures/SampleSupabaseService";
import {createSupabaseMockServer, SupabaseMockServerHandle} from "./fixtures/supabaseMockServer";

const SUPABASE_MOCK_PORT = 34982;
let mockServer: SupabaseMockServerHandle;

describe("@nodeboot/starter-supabase - Service DI injection and operations", () => {
    useNodeBoot(SupabaseServiceApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-supabase-service-injection-test"},
            integrations: {
                supabase: {
                    url: `http://127.0.0.1:${SUPABASE_MOCK_PORT}`,
                    anonKey: "test-anon-key-service-injection",
                },
            },
        });
    });

    before(async () => {
        mockServer = await createSupabaseMockServer(SUPABASE_MOCK_PORT);
    });

    after(async () => {
        if (mockServer) {
            await mockServer.close();
        }
    });

    test("injects SupabaseClient into SampleSupabaseService and queries profiles", async () => {
        const service = Container.get(SampleSupabaseService);

        assert.ok(service instanceof SampleSupabaseService);
        assert.ok(service.supabase instanceof SupabaseClient);

        const profiles = await service.getProfiles();
        assert.ok(Array.isArray(profiles));
        assert.equal(profiles.length, 2);
        assert.equal(profiles[0].name, "Alice");
        assert.equal(profiles[1].name, "Bob");
    });

    test("calls RPC calculateTotal through the injected service", async () => {
        const service = Container.get(SampleSupabaseService);

        const total = await service.calculateTotal([
            {price: 25, quantity: 4},
            {price: 50, quantity: 1},
        ]);

        assert.equal(total, 150);
    });
});
