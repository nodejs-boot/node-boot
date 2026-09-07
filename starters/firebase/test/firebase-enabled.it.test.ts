/**
 * Auto-configuration integration test for `@nodeboot/starter-firebase`.
 *
 * No negative counterpart: without `integrations.firebase` config, `initFirebase()` logs and skips
 * `admin.initializeApp()`, but the other `@Bean` methods on the same `@Configuration` class
 * (`firebaseAuth`, `firestoreClient`, ...) still run unconditionally and call `admin.auth()` /
 * `admin.firestore()` etc., which throw without an initialized app - a boot-time crash, not a
 * graceful disabled path (same class of issue as `@nodeboot/starter-supabase` - see
 * `nodeboot-extending-nodeboot`'s "Testing a starter package" section).
 */
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {Container} from "typedi";
import {appCheck, auth, database, firestore, machineLearning, messaging, remoteConfig, storage} from "firebase-admin";
import {useNodeBoot} from "@nodeboot/node-test";
import {FirebaseEnabledApp} from "./fixtures/FirebaseEnabledApp";
import {testServiceAccountPath} from "./fixtures/testServiceAccountFile";
import {
    FIREBASE_APP_CHECK_BEAN,
    FIREBASE_AUTH_BEAN,
    FIREBASE_FIRESTORE_BEAN,
    FIREBASE_MACHINE_LEARNING_BEAN,
    FIREBASE_MESSAGING_BEAN,
    FIREBASE_REALTIME_DATABASE_BEAN,
    FIREBASE_REMOTE_CONFIG_BEAN,
    FIREBASE_STORAGE_BEAN,
} from "../src";

describe("@nodeboot/starter-firebase auto-configuration - integrations.firebase configured", () => {
    // `@nodeboot/node-test` resolves `NodeBootApp` against its own (published) `@nodeboot/core`
    // dependency, which TypeScript treats as nominally distinct from this monorepo's workspace
    // package of the same name - cast at the boundary rather than relaxing the fixture's typing.
    useNodeBoot(FirebaseEnabledApp as any, ({useConfig}) => {
        useConfig({
            app: {name: "starter-firebase-enabled-test"},
            integrations: {
                firebase: {
                    serviceAccount: testServiceAccountPath,
                    projectId: "test-project",
                    // `admin.database()`'s `@Bean` runs unconditionally at boot (not lazily on
                    // first use), and throws without a resolvable database URL.
                    realtimeDatabaseUrl: "https://test-project-default-rtdb.firebaseio.com",
                    storageBucket: "test-project.appspot.com",
                    serviceAccountId: "test@test-project.iam.gserviceaccount.com",
                },
            },
        });
    });

    test("registers all Firebase Admin services as named DI beans in the IoC container", () => {
        // `@nodeboot/node-test`'s own `useService()` resolves against a different (published)
        // `ApplicationContext` singleton than this workspace's real running app - see
        // `nodeboot-test-framework`. Retrieve straight from `typedi`'s Container, the one
        // `@EnableDI(Container)` actually wired these beans into.

        // 1. Firebase Authentication
        const firebaseAuth = Container.get<auth.Auth>(FIREBASE_AUTH_BEAN);
        assert.ok(firebaseAuth, "Firebase Auth bean should be defined");
        assert.equal(typeof firebaseAuth.createCustomToken, "function");
        assert.equal(typeof firebaseAuth.verifyIdToken, "function");

        // 2. Cloud Firestore
        const firestoreClient = Container.get<firestore.Firestore>(FIREBASE_FIRESTORE_BEAN);
        assert.ok(firestoreClient, "Firestore bean should be defined");
        assert.equal(typeof firestoreClient.collection, "function");
        assert.equal(typeof firestoreClient.doc, "function");

        // 3. Cloud Storage
        const firebaseStorage = Container.get<storage.Storage>(FIREBASE_STORAGE_BEAN);
        assert.ok(firebaseStorage, "Firebase Storage bean should be defined");
        assert.equal(typeof firebaseStorage.bucket, "function");

        // 4. Realtime Database
        const realtimeDb = Container.get<database.Database>(FIREBASE_REALTIME_DATABASE_BEAN);
        assert.ok(realtimeDb, "Realtime Database bean should be defined");
        assert.equal(typeof realtimeDb.ref, "function");

        // 5. Cloud Messaging (FCM)
        const firebaseMessaging = Container.get<messaging.Messaging>(FIREBASE_MESSAGING_BEAN);
        assert.ok(firebaseMessaging, "Firebase Messaging bean should be defined");
        assert.equal(typeof firebaseMessaging.send, "function");

        // 6. Remote Config
        const firebaseRemoteConfig = Container.get<remoteConfig.RemoteConfig>(FIREBASE_REMOTE_CONFIG_BEAN);
        assert.ok(firebaseRemoteConfig, "Remote Config bean should be defined");
        assert.equal(typeof firebaseRemoteConfig.getTemplate, "function");

        // 7. App Check
        const firebaseAppCheck = Container.get<appCheck.AppCheck>(FIREBASE_APP_CHECK_BEAN);
        assert.ok(firebaseAppCheck, "App Check bean should be defined");
        assert.equal(typeof firebaseAppCheck.createToken, "function");

        // 8. Machine Learning
        const firebaseMl = Container.get<machineLearning.MachineLearning>(FIREBASE_MACHINE_LEARNING_BEAN);
        assert.ok(firebaseMl, "Machine Learning bean should be defined");
        assert.equal(typeof firebaseMl.createModel, "function");
    });

    test("performs local / offline operations on injected Firebase services", async () => {
        // Firebase Auth: generate custom JWT token signed with synthetic RSA private key
        const firebaseAuth = Container.get<auth.Auth>(FIREBASE_AUTH_BEAN);
        const customToken = await firebaseAuth.createCustomToken("test-user-id", {
            role: "admin",
            tenantId: "node-boot-tenant",
        });
        assert.equal(typeof customToken, "string");
        assert.ok(customToken.length > 0, "Custom token should not be empty");

        // Cloud Storage: bucket reference resolves configured storageBucket name
        const firebaseStorage = Container.get<storage.Storage>(FIREBASE_STORAGE_BEAN);
        const bucket = firebaseStorage.bucket();
        assert.equal(bucket.name, "test-project.appspot.com");
        const fileRef = bucket.file("documents/report.pdf");
        assert.equal(fileRef.name, "documents/report.pdf");

        // Cloud Firestore: collection and document reference building
        const firestoreClient = Container.get<firestore.Firestore>(FIREBASE_FIRESTORE_BEAN);
        const docRef = firestoreClient.collection("users").doc("test-user-id");
        assert.equal(docRef.path, "users/test-user-id");
        assert.equal(docRef.id, "test-user-id");

        // Realtime Database: reference building with configured database URL path
        const realtimeDb = Container.get<database.Database>(FIREBASE_REALTIME_DATABASE_BEAN);
        const dbRef = realtimeDb.ref("users/test-user-id");
        assert.equal(dbRef.key, "test-user-id");
    });
});
