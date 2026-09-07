/**
 * Integration test for Supabase services (Database/PostgREST, RPC, Auth, Storage, Functions)
 * using the official `@supabase/supabase-js` SDK against an in-process mock Supabase server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {SupabaseClient} from "@supabase/supabase-js";
import {useNodeBoot} from "@nodeboot/node-test";
import {SupabaseEnabledApp} from "./fixtures/SupabaseEnabledApp";
import {createSupabaseMockServer, SupabaseMockServerHandle} from "./fixtures/supabaseMockServer";

const SUPABASE_MOCK_PORT = 34981;
let mockServer: SupabaseMockServerHandle;

describe("@nodeboot/starter-supabase - Supabase available services integration tests (RPC & SDK)", () => {
    useNodeBoot(SupabaseEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-supabase-services-test"},
            integrations: {
                supabase: {
                    url: `http://127.0.0.1:${SUPABASE_MOCK_PORT}`,
                    serviceRoleKey: "test-service-role-key-xyz",
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

    // ==========================================
    // 1. PostgREST / Database CRUD Operations
    // ==========================================
    test("Database: retrieves all rows from a table", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.from("profiles").select("*");

        assert.equal(error, null);
        assert.ok(Array.isArray(data));
        assert.equal(data.length, 2);
        assert.equal(data[0]?.["name"], "Alice");
        assert.equal(data[1]?.["name"], "Bob");
    });

    test("Database: finds a single row by filtering (positive case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.from("profiles").select("*").eq("id", "user-1").single();

        assert.equal(error, null);
        assert.ok(data);
        assert.equal(data["id"], "user-1");
        assert.equal(data["email"], "user1@example.com");
    });

    test("Database: returns error when single row is not found (negative case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.from("profiles").select("*").eq("id", "non-existent-id").single();

        assert.equal(data, null);
        assert.ok(error);
        assert.equal(error.code, "PGRST116");
    });

    test("Database: inserts a new record and returns the inserted representation", async () => {
        const client = Container.get(SupabaseClient);
        const newProfile = {id: "user-3", email: "user3@example.com", name: "Charlie"};
        const {data, error} = await client.from("profiles").insert([newProfile]).select().single();

        assert.equal(error, null);
        assert.ok(data);
        assert.equal(data["id"], "user-3");
        assert.equal(data["name"], "Charlie");

        // Verify count increased
        const {data: all} = await client.from("profiles").select("*");
        assert.equal(all?.length, 3);
    });

    test("Database: updates an existing record", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client
            .from("profiles")
            .update({name: "Alice Cooper"})
            .eq("id", "user-1")
            .select()
            .single();

        assert.equal(error, null);
        assert.ok(data);
        assert.equal(data["name"], "Alice Cooper");
    });

    test("Database: deletes a record", async () => {
        const client = Container.get(SupabaseClient);
        const {error} = await client.from("profiles").delete().eq("id", "user-2");

        assert.equal(error, null);

        // Verify user-2 is gone
        const {data} = await client.from("profiles").select("*").eq("id", "user-2");
        assert.equal(data?.length, 0);
    });

    // ==========================================
    // 2. RPC (Remote Procedure Call)
    // ==========================================
    test("RPC: executes a custom procedure with parameters (positive case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.rpc("calculate_total", {
            items: [
                {price: 15, quantity: 2},
                {price: 10, quantity: 3},
            ],
        });

        assert.equal(error, null);
        assert.equal(data, 60); // 15*2 + 10*3 = 60
    });

    test("RPC: executes a procedure returning a structured object", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.rpc("get_service_status");

        assert.equal(error, null);
        assert.ok(data);
        assert.equal((data as any)["status"], "healthy");
        assert.equal((data as any)["version"], "1.0.0");
    });

    test("RPC: returns error when calling a non-existent procedure (negative case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.rpc("unknown_procedure_xyz");

        assert.equal(data, null);
        assert.ok(error);
        assert.equal(error.code, "PGRST202");
    });

    // ==========================================
    // 3. Auth SDK Operations
    // ==========================================
    test("Auth: signs up a new user", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.auth.signUp({
            email: "newsignup@example.com",
            password: "SecurePassword123!",
            options: {data: {name: "New User"}},
        });

        assert.equal(error, null);
        assert.ok(data.user);
        assert.equal(data.user.email, "newsignup@example.com");
        assert.equal(data.user.user_metadata?.["name"], "New User");
        assert.ok(data.session?.access_token);
    });

    test("Auth: signs in with email and password (positive case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.auth.signInWithPassword({
            email: "user1@example.com",
            password: "CorrectPassword",
        });

        assert.equal(error, null);
        assert.ok(data.session?.access_token);
        assert.ok(data.user);
    });

    test("Auth: fails to sign in with incorrect password (negative case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.auth.signInWithPassword({
            email: "user1@example.com",
            password: "wrong-password",
        });

        assert.equal(data.user, null);
        assert.ok(error);
        assert.equal(error.message, "Invalid login credentials");
    });

    test("Auth: gets current user using access token (positive case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.auth.getUser("valid-token-123");

        assert.equal(error, null);
        assert.ok(data.user);
        assert.equal(data.user.email, "user1@example.com");
    });

    test("Auth: returns error when getting user with invalid token (negative case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.auth.getUser("invalid-token-xyz");

        assert.equal(data.user, null);
        assert.ok(error);
    });

    test("Auth Admin: creates, lists, and deletes users via admin API", async () => {
        const client = Container.get(SupabaseClient);

        // 1. Create user
        const {data: created, error: createError} = await client.auth.admin.createUser({
            email: "admin_created@example.com",
            password: "AdminCreatedPassword123!",
            user_metadata: {role: "editor"},
        });
        assert.equal(createError, null);
        assert.ok(created.user);
        const newUserId = created.user.id;

        // 2. List users
        const {data: listData, error: listError} = await client.auth.admin.listUsers();
        assert.equal(listError, null);
        assert.ok(listData.users.some(u => u.email === "admin_created@example.com"));

        // 3. Delete user
        const {error: deleteError} = await client.auth.admin.deleteUser(newUserId);
        assert.equal(deleteError, null);
    });

    // ==========================================
    // 4. Storage SDK Operations
    // ==========================================
    test("Storage: creates and lists storage buckets", async () => {
        const client = Container.get(SupabaseClient);

        // Create bucket
        const {data: bucket, error: createError} = await client.storage.createBucket("documents", {
            public: false,
        });
        assert.equal(createError, null);
        assert.ok(bucket);

        // List buckets
        const {data: buckets, error: listError} = await client.storage.listBuckets();
        assert.equal(listError, null);
        assert.ok(buckets?.some(b => b.name === "documents" || b.id === "documents"));
    });

    test("Storage: uploads, downloads, lists, and removes files", async () => {
        const client = Container.get(SupabaseClient);
        const fileContent = Buffer.from("Sample Document Content in PDF");

        // Upload
        const {data: uploadData, error: uploadError} = await client.storage
            .from("documents")
            .upload("reports/annual-report.txt", fileContent, {contentType: "text/plain"});

        assert.equal(uploadError, null);
        assert.ok(uploadData?.path);

        // List files in bucket
        const {data: files, error: listFilesError} = await client.storage.from("documents").list();
        assert.equal(listFilesError, null);
        assert.ok(files?.some(f => f.name === "reports/annual-report.txt"));

        // Download
        const {data: blobData, error: downloadError} = await client.storage
            .from("documents")
            .download("reports/annual-report.txt");

        assert.equal(downloadError, null);
        assert.ok(blobData);
        const text = await blobData.text();
        assert.equal(text, "Sample Document Content in PDF");

        // Remove
        const {data: removeData, error: removeError} = await client.storage
            .from("documents")
            .remove(["reports/annual-report.txt"]);

        assert.equal(removeError, null);
        assert.ok(removeData);
    });

    test("Storage: returns 404 when downloading non-existent file (negative case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.storage.from("avatars").download("non-existent-photo.png");

        assert.equal(data, null);
        assert.ok(error);
    });

    // ==========================================
    // 5. Edge Functions SDK Operations
    // ==========================================
    test("Functions: invokes a Supabase Edge Function (positive case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.functions.invoke("hello-world", {
            body: {name: "Node-Boot Monorepo"},
        });

        assert.equal(error, null);
        assert.ok(data);
        assert.equal((data as any)["message"], "Hello, Node-Boot Monorepo!");
    });

    test("Functions: returns error for non-existent function (negative case)", async () => {
        const client = Container.get(SupabaseClient);
        const {data, error} = await client.functions.invoke("missing-edge-function");

        assert.equal(data, null);
        assert.ok(error);
    });
});
