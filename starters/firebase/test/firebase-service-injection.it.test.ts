/**
 * Integration test verifying injection of all 8 Firebase Admin services
 * into an application @Service component.
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {useNodeBoot} from "@nodeboot/node-test";
import {FirebaseEnabledApp} from "./fixtures/FirebaseEnabledApp";
import {testServiceAccountPath} from "./fixtures/testServiceAccountFile";
import {SampleFirebaseService} from "./fixtures/SampleFirebaseService";

describe("@nodeboot/starter-firebase - Service Injection Integration", () => {
    useNodeBoot(FirebaseEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-firebase-service-injection-test"},
            integrations: {
                firebase: {
                    serviceAccount: testServiceAccountPath,
                    projectId: "test-service-injection-project",
                    realtimeDatabaseUrl: "https://test-service-injection-project-default-rtdb.firebaseio.com",
                    storageBucket: "test-service-injection-project.appspot.com",
                    serviceAccountId: "test@test-service-injection-project.iam.gserviceaccount.com",
                },
            },
        });
    });

    test("injects all 8 Firebase Admin beans into a @Service class", async () => {
        const service = Container.get(SampleFirebaseService);

        assert.ok(service, "SampleFirebaseService should be resolvable from container");
        assert.ok(service.authClient, "authClient should be injected");
        assert.ok(service.firestoreClient, "firestoreClient should be injected");
        assert.ok(service.storageClient, "storageClient should be injected");
        assert.ok(service.realtimeDbClient, "realtimeDbClient should be injected");
        assert.ok(service.messagingClient, "messagingClient should be injected");
        assert.ok(service.remoteConfigClient, "remoteConfigClient should be injected");
        assert.ok(service.appCheckClient, "appCheckClient should be injected");
        assert.ok(service.machineLearningClient, "machineLearningClient should be injected");
    });

    test("performs operations through injected service methods", async () => {
        const service = Container.get(SampleFirebaseService);

        // 1. Auth custom token generation
        const token = await service.createCustomToken("user-42", {role: "editor"});
        assert.equal(typeof token, "string");
        assert.ok(token.length > 0);

        // 2. Storage bucket configuration
        const bucketName = service.getBucketName();
        assert.equal(bucketName, "test-service-injection-project.appspot.com");
        const fileRef = service.getFileRef("images/photo.png");
        assert.equal(fileRef.name, "images/photo.png");

        // 3. Firestore document reference
        const docRef = service.getDocRef("orders", "order-123");
        assert.equal(docRef.path, "orders/order-123");
        assert.equal(docRef.id, "order-123");

        // 4. Realtime Database reference
        const dbRef = service.getDbRef("chats/room-1");
        assert.equal(dbRef.key, "room-1");
    });
});
