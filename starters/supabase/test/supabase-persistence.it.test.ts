/**
 * Integration test combining `@EnableSupabase()` with `@EnableRepositories()` from
 * `@nodeboot/starter-persistence`.
 *
 * Demonstrates and validates the dual data-access pattern:
 * 1. Direct database interaction via Node-Boot `@DataRepository` TypeORM repository pattern.
 * 2. Supabase services (Auth, RPC, Storage, PostgREST) via the injected `SupabaseClient` SDK.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {Container} from "typedi";
import {SupabaseClient} from "@supabase/supabase-js";
import {useNodeBoot} from "@nodeboot/node-test";
import {SupabasePersistenceApp} from "./fixtures/SupabasePersistenceApp";
import {UserProfileRepository} from "./fixtures/UserProfileRepository";
import {createSupabaseMockServer, SupabaseMockServerHandle} from "./fixtures/supabaseMockServer";

const SUPABASE_PERSISTENCE_MOCK_PORT = 34983;
let mockServer: SupabaseMockServerHandle;

describe("@nodeboot/starter-supabase & @nodeboot/starter-persistence - Dual Data Access Integration Tests", () => {
    useNodeBoot(SupabasePersistenceApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-supabase-persistence-dual-test"},
            integrations: {
                supabase: {
                    url: `http://127.0.0.1:${SUPABASE_PERSISTENCE_MOCK_PORT}`,
                    serviceRoleKey: "dual-access-service-role-key",
                },
            },
            persistence: {
                type: "better-sqlite3",
                "better-sqlite3": {
                    database: ":memory:",
                    synchronize: true,
                },
            },
        });
    });

    before(async () => {
        mockServer = await createSupabaseMockServer(SUPABASE_PERSISTENCE_MOCK_PORT);
    });

    after(async () => {
        if (mockServer) {
            await mockServer.close();
        }
    });

    test("wires both SupabaseClient and UserProfileRepository into the DI container", () => {
        const client = Container.get(SupabaseClient);
        const repository = Container.get(UserProfileRepository);

        assert.ok(client instanceof SupabaseClient);
        assert.ok(repository instanceof UserProfileRepository);
    });

    test("performs direct database CRUD operations using Node-Boot repository pattern", async () => {
        const repository = Container.get(UserProfileRepository);

        // 1. Create and save entity directly to database
        const userId = randomUUID();
        const profile = repository.create({
            id: userId,
            email: "direct_db_user@example.com",
            name: "Direct DB User",
            role: "ADMIN",
        });
        const saved = await repository.save(profile);

        assert.ok(saved.id);
        assert.equal(saved.id, userId);
        assert.equal(saved.email, "direct_db_user@example.com");
        assert.equal(saved.name, "Direct DB User");
        assert.equal(saved.role, "ADMIN");

        // 2. Query entity directly from database
        const found = await repository.findOneBy({id: saved.id});
        assert.ok(found);
        assert.equal(found.id, saved.id);
        assert.equal(found.name, "Direct DB User");

        // 3. Count entities
        const count = await repository.count();
        assert.equal(count, 1);

        // 4. Update entity directly
        saved.name = "Direct DB User Updated";
        await repository.save(saved);
        const updated = await repository.findOneBy({id: saved.id});
        assert.equal(updated?.name, "Direct DB User Updated");

        // 5. Delete entity
        await repository.delete(saved.id);
        const afterDelete = await repository.findOneBy({id: saved.id});
        assert.equal(afterDelete, null);
        assert.equal(await repository.count(), 0);
    });

    test("performs Supabase services (RPC & SDK) alongside repository in the same app context", async () => {
        const client = Container.get(SupabaseClient);
        const repository = Container.get(UserProfileRepository);

        // 1. Execute Supabase RPC call
        const {data: rpcTotal, error: rpcError} = await client.rpc("calculate_total", {
            items: [
                {price: 100, quantity: 2},
                {price: 50, quantity: 3},
            ],
        });
        assert.equal(rpcError, null);
        assert.equal(rpcTotal, 350);

        // 2. Provision Supabase Auth User via SDK
        const {data: authData, error: authError} = await client.auth.signUp({
            email: "hybrid_user@example.com",
            password: "SecureHybridPassword123!",
            options: {data: {name: "Hybrid User"}},
        });
        assert.equal(authError, null);
        assert.ok(authData.user?.id);

        // 3. Persist corresponding profile in direct SQL database via Node-Boot Repository
        const directSaved = await repository.save(
            repository.create({
                id: authData.user!.id,
                email: authData.user!.email!,
                name: "Hybrid User",
                role: "USER",
            }),
        );

        assert.equal(directSaved.id, authData.user!.id);
        assert.equal(directSaved.email, "hybrid_user@example.com");

        // 4. Verify direct DB lookup finds the record created from Supabase Auth ID
        const matched = await repository.findOneBy({id: authData.user!.id});
        assert.ok(matched);
        assert.equal(matched.email, "hybrid_user@example.com");
    });
});
