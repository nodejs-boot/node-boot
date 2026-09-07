/**
 * Integration test for Firebase services interacting with local emulator endpoints.
 *
 * Exercises real Admin SDK client operations across positive and negative cases
 * through local emulator environment variables (`FIREBASE_AUTH_EMULATOR_HOST`,
 * `FIREBASE_STORAGE_EMULATOR_HOST`) using an in-process mock emulator server.
 */
import {after, before, describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {auth, storage} from "firebase-admin";
import {useNodeBoot} from "@nodeboot/node-test";
import {FirebaseEnabledApp} from "./fixtures/FirebaseEnabledApp";
import {testServiceAccountPath} from "./fixtures/testServiceAccountFile";
import {createFirebaseMockServer, FirebaseMockServerHandle} from "./fixtures/firebaseMockServer";
import {FIREBASE_AUTH_BEAN, FIREBASE_STORAGE_BEAN} from "../src";

const MOCK_PORT = 34975;
process.env["FIREBASE_AUTH_EMULATOR_HOST"] = `127.0.0.1:${MOCK_PORT}`;
process.env["FIREBASE_STORAGE_EMULATOR_HOST"] = `127.0.0.1:${MOCK_PORT}`;

let mockServer: FirebaseMockServerHandle;

describe("@nodeboot/starter-firebase - emulator operations (positive and negative cases)", () => {
    useNodeBoot(FirebaseEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-firebase-emulator-test"},
            integrations: {
                firebase: {
                    serviceAccount: testServiceAccountPath,
                    projectId: "test-emulator-project",
                    realtimeDatabaseUrl: "https://test-emulator-project-default-rtdb.firebaseio.com",
                    storageBucket: "test-emulator-project.appspot.com",
                    serviceAccountId: "test@test-emulator-project.iam.gserviceaccount.com",
                },
            },
        });
    });

    before(async () => {
        mockServer = createFirebaseMockServer(MOCK_PORT);
        await new Promise<void>(resolve => {
            if (mockServer.server.listening) {
                resolve();
            } else {
                mockServer.server.once("listening", resolve);
            }
        });
    });

    after(async () => {
        delete process.env["FIREBASE_AUTH_EMULATOR_HOST"];
        delete process.env["FIREBASE_STORAGE_EMULATOR_HOST"];
        if (mockServer) {
            await mockServer.close();
        }
    });

    // 1. Firebase Auth operations via emulator
    test("Auth: fetches an existing user successfully (positive case)", async () => {
        const firebaseAuth = Container.get<auth.Auth>(FIREBASE_AUTH_BEAN);
        const user = await firebaseAuth.getUser("test-uid-1");

        assert.equal(user.uid, "test-uid-1");
        assert.equal(user.email, "test-user-1@example.com");
        assert.equal(user.displayName, "Test User 1");
    });

    test("Auth: throws auth/user-not-found when user does not exist (negative case)", async () => {
        const firebaseAuth = Container.get<auth.Auth>(FIREBASE_AUTH_BEAN);

        await assert.rejects(
            async () => {
                await firebaseAuth.getUser("non-existent-uid");
            },
            (err: any) => {
                assert.equal(err.code, "auth/user-not-found");
                assert.match(err.message, /There is no user record/);
                return true;
            },
        );
    });

    // 2. Cloud Storage operations via emulator
    test("Storage: retrieves metadata for an existing file (positive case)", async () => {
        const firebaseStorage = Container.get<storage.Storage>(FIREBASE_STORAGE_BEAN);
        const bucket = firebaseStorage.bucket();
        const file = bucket.file("sample.txt");

        const [metadata] = await file.getMetadata();
        assert.equal(metadata.name, "sample.txt");
        assert.equal(metadata.contentType, "text/plain");
        assert.equal(metadata.size, "32");
    });

    test("Storage: throws 404 when file does not exist (negative case)", async () => {
        const firebaseStorage = Container.get<storage.Storage>(FIREBASE_STORAGE_BEAN);
        const bucket = firebaseStorage.bucket();
        const file = bucket.file("missing-file.txt");

        await assert.rejects(
            async () => {
                await file.getMetadata();
            },
            (err: any) => {
                assert.equal(err.code, 404);
                assert.match(err.message, /No such object: missing-file\.txt/);
                return true;
            },
        );
    });
});
