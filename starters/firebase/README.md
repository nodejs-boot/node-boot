# 🔥 `@nodeboot/starter-firebase` – Node-Boot Firebase Starter

## Overview

`@nodeboot/starter-firebase` integrates the **[Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)** into a Node-Boot application, following the same auto-configuration philosophy as Spring Boot: initialize the SDK once from `app-config.yaml`, then expose each Firebase service (Auth, Firestore, Storage, Realtime Database, Cloud Messaging, Remote Config, App Check, Machine Learning) as an injectable Node-Boot bean, so your services and controllers never have to call `admin.initializeApp(...)` or `admin.<service>()` themselves.

---

## ✨ Features

✅ **One-line activation** with `@EnableFirebase()`
✅ **Auto-configured Firebase Admin SDK** from `app-config.yaml` (service account, project ID, storage bucket, realtime database URL)
✅ **Eight ready-to-inject service beans** — Auth, Firestore, Storage, Realtime Database, Messaging, Remote Config, App Check, Machine Learning
✅ **DI-friendly** — every bean is resolved through Node-Boot's IoC container using `@Inject(BEAN_TOKEN)`
✅ **Composable with `@nodeboot/authorization`** to protect controllers using Firebase ID tokens
✅ **Winston-backed logging** during initialization and bean creation

---

## 🚀 Installation

```sh
pnpm add @nodeboot/starter-firebase firebase-admin winston
```

> `firebase-admin` and `winston` are peer dependencies — the starter uses whichever version you install, so you control SDK upgrades independently of Node-Boot releases.

---

## ⚙️ Configuration

Add your Firebase project settings under `integrations.firebase` in `app-config.yaml`:

```yaml
integrations:
    firebase:
        serviceAccount: "./firebase-service-account.json"
        realtimeDatabaseUrl: "https://your-project-id.firebaseio.com"
        storageBucket: "your-project.appspot.com"
        serviceAccountId: "your-service-account@your-project.iam.gserviceaccount.com"
        projectId: "your-project-id"
```

**Configuration properties** (all optional individually, but `serviceAccount` is required for the SDK to actually authenticate):

| Key                   | Description                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `serviceAccount`      | Path to your Firebase service account JSON file. [Learn more](https://firebase.google.com/docs/admin/setup#initialize-sdk). |
| `realtimeDatabaseUrl` | URL of your Firebase Realtime Database instance, e.g. `https://your-project-id.firebaseio.com`.                             |
| `storageBucket`       | Google Cloud Storage bucket name, **without** the `gs://` prefix, e.g. `your-project.appspot.com`.                          |
| `serviceAccountId`    | The service account's `client_email`, used when signing custom Firebase Auth tokens.                                        |
| `projectId`           | Google Cloud project ID associated with the Firebase app.                                                                   |

> For production, keep the service account path/credentials out of source control — reference them via environment variables (`serviceAccount: "${FIREBASE_SERVICE_ACCOUNT_PATH}"`) or mount the JSON file as a secret in your deployment environment.

---

## 🔌 Enabling Firebase Integration

Apply `@EnableFirebase()` to your main application class:

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootAppView, NodeBootApplication} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableFirebase} from "@nodeboot/starter-firebase";

@EnableDI(Container)
@EnableFirebase()
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

This registers `FirebaseAdminConfiguration`, which calls `admin.initializeApp(...)` once at startup (using the config above) and then exposes each Firebase service as a bean.

---

## 💉 Injecting Firebase Services

Every service is registered under a **named** bean token, so you inject it with `@Inject(BEAN_TOKEN)` — plain type-based injection won't resolve these, since `firebase-admin`'s service types (`auth.Auth`, `firestore.Firestore`, ...) aren't classes Node-Boot can use as injection tokens on their own.

| Bean token                        | Firebase service                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `FIREBASE_AUTH_BEAN`              | [Firebase Authentication](https://firebase.google.com/docs/auth/admin) (`auth.Auth`)              |
| `FIREBASE_FIRESTORE_BEAN`         | [Cloud Firestore](https://firebase.google.com/docs/firestore) (`firestore.Firestore`)             |
| `FIREBASE_STORAGE_BEAN`           | [Cloud Storage](https://firebase.google.com/docs/storage) (`storage.Storage`)                     |
| `FIREBASE_REALTIME_DATABASE_BEAN` | [Realtime Database](https://firebase.google.com/docs/database/admin/start) (`database.Database`)  |
| `FIREBASE_MESSAGING_BEAN`         | [Cloud Messaging / FCM](https://firebase.google.com/docs/cloud-messaging) (`messaging.Messaging`) |
| `FIREBASE_REMOTE_CONFIG_BEAN`     | [Remote Config](https://firebase.google.com/docs/remote-config) (`remoteConfig.RemoteConfig`)     |
| `FIREBASE_APP_CHECK_BEAN`         | [App Check](https://firebase.google.com/docs/app-check) (`appCheck.AppCheck`)                     |
| `FIREBASE_MACHINE_LEARNING_BEAN`  | [Machine Learning](https://firebase.google.com/docs/ml) (`machineLearning.MachineLearning`)       |

### Example: Firestore CRUD service

```typescript
import {Service, Inject} from "@nodeboot/core";
import {FIREBASE_FIRESTORE_BEAN} from "@nodeboot/starter-firebase";
import {firestore} from "firebase-admin";
import {Logger} from "winston";

interface Todo {
    title: string;
    done: boolean;
}

@Service()
export class TodoService {
    constructor(
        private readonly logger: Logger,
        @Inject(FIREBASE_FIRESTORE_BEAN)
        private readonly firestoreClient: firestore.Firestore,
    ) {}

    async createTodo(todo: Todo) {
        const ref = await this.firestoreClient.collection("todos").add(todo);
        this.logger.info(`Created todo ${ref.id}`);
        return {id: ref.id, ...todo};
    }

    async listTodos() {
        const snapshot = await this.firestoreClient.collection("todos").orderBy("title").get();
        return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
    }
}
```

### Example: Cloud Storage service

```typescript
import {Service, Inject} from "@nodeboot/core";
import {FIREBASE_STORAGE_BEAN} from "@nodeboot/starter-firebase";
import {storage} from "firebase-admin";
import {Logger} from "winston";

@Service()
export class FileStorageService {
    constructor(
        private readonly logger: Logger,
        @Inject(FIREBASE_STORAGE_BEAN)
        private readonly firebaseStorage: storage.Storage,
    ) {}

    async uploadFile(path: string, file: Buffer, contentType?: string) {
        const bucket = this.firebaseStorage.bucket();
        const upload = bucket.file(path);
        await upload.save(file, {contentType});
        this.logger.info(`Uploaded file to ${path}`);
        return upload.publicUrl();
    }
}
```

### Example: Cloud Messaging (push notifications)

```typescript
import {Service, Inject} from "@nodeboot/core";
import {FIREBASE_MESSAGING_BEAN} from "@nodeboot/starter-firebase";
import {messaging} from "firebase-admin";
import {Logger} from "winston";

@Service()
export class PushNotificationService {
    constructor(
        private readonly logger: Logger,
        @Inject(FIREBASE_MESSAGING_BEAN)
        private readonly firebaseMessaging: messaging.Messaging,
    ) {}

    async sendToDevice(deviceToken: string, title: string, body: string) {
        const messageId = await this.firebaseMessaging.send({
            token: deviceToken,
            notification: {title, body},
        });
        this.logger.info(`Sent push notification: ${messageId}`);
        return messageId;
    }
}
```

### Example: Remote Config

```typescript
import {Service, Inject} from "@nodeboot/core";
import {FIREBASE_REMOTE_CONFIG_BEAN} from "@nodeboot/starter-firebase";
import {remoteConfig} from "firebase-admin";
import {Logger} from "winston";

@Service()
export class FeatureFlagService {
    constructor(
        private readonly logger: Logger,
        @Inject(FIREBASE_REMOTE_CONFIG_BEAN)
        private readonly firebaseRemoteConfig: remoteConfig.RemoteConfig,
    ) {}

    async listVersions() {
        this.logger.info("Fetching Firebase Remote Config versions...");
        const result = await this.firebaseRemoteConfig.listVersions();
        this.logger.info(`Retrieved ${result.versions.length} versions.`);
        return result.versions;
    }
}
```

---

## 🔐 Authorization in Node-Boot Controllers with Firebase Auth

To protect controllers using Firebase ID tokens (verifying `Authorization: Bearer <idToken>` and enforcing roles with `@Authorized()` / `@CurrentUser()`), pair this starter with **[`@nodeboot/authorization`](https://github.com/nodejs-boot/node-boot/tree/main/packages/authorization)**, injecting `FIREBASE_AUTH_BEAN` into a `CurrentUserChecker`/`AuthorizationChecker` pair that calls `firebaseAuth.verifyIdToken(...)`.

A full, ready-to-copy example — `FirebaseUserResolver`, `FirebaseAuthorizationChecker`, application wiring, and controller usage — is documented in the **"Firebase Authentication"** production use case of the [`@nodeboot/authorization` README](https://github.com/nodejs-boot/node-boot/tree/main/packages/authorization#-production-use-cases).

---

## 🪵 Logging

`FirebaseAdminConfiguration` logs through your application's Winston logger during initialization and whenever a service bean is created (e.g. `🔐 Injecting Firebase Authentication Service`, `📂 Injecting Firebase Firestore Service`).

If `serviceAccount` is missing or the `integrations.firebase` section isn't configured at all, initialization logs an error/warning instead of throwing, so the rest of your application can still start:

```
No configuration provided for Firebase integration. Please configure "integrations.firebase.serviceAccount=./path/to/firebase.service-account.json"
```

```
You've enabled Firebase using @EnableFirebase, but no configuration was provided under "integrations.firebase" in the app-config.yaml.
```

Any bean injected without successful initialization will fail at first use (e.g. calling a method on `undefined`/an unconfigured client) rather than at startup — always check your startup logs after enabling Firebase for the first time.

---

## 🧯 Troubleshooting

### "No configuration provided for Firebase integration"

Make sure `integrations.firebase.serviceAccount` points to a valid, readable service account JSON file, and that the path is correct relative to your application's working directory at runtime (not just at build time).

### `Cannot find module '<path-to-service-account>.json'`

The `serviceAccount` path is resolved relative to the process's current working directory. Double-check the path when running from a different directory (e.g. inside a Docker container) and prefer an absolute path or an environment variable in production.

### Injected bean is `undefined` or throws unexpectedly

Confirm `@EnableFirebase()` is present on your application class and that it runs **before** any component that injects a `FIREBASE_*_BEAN` is constructed — component scanning order matters if you have custom bootstrap logic.

### `storageBucket`/`realtimeDatabaseUrl` not required unless you use them

You only need to configure the settings relevant to the services you actually use — e.g. skip `realtimeDatabaseUrl` if you don't inject `FIREBASE_REALTIME_DATABASE_BEAN`.

---

## 🔒 Security Best Practices

-   **Never commit the service account JSON file** to source control — load its path from an environment variable and mount/inject the secret at deploy time.
-   **Use least-privilege service accounts.** The Firebase Admin SDK has full backend access; scope the underlying Google Cloud service account's IAM roles to only what your application needs.
-   **Prefer custom claims (`admin.auth().setCustomUserClaims(...)`) for authorization roles**, since they can only be set server-side and are included in verified ID tokens — see the [Firebase Auth authorization section](#-authorization-in-node-boot-controllers-with-firebase-auth) above.
-   **Rotate service account keys periodically** and revoke unused ones from the Google Cloud console.

---

## 🎉 Conclusion

`@nodeboot/starter-firebase` gives Node-Boot applications a ready-to-inject Firebase Admin SDK setup — Auth, Firestore, Storage, Realtime Database, Messaging, Remote Config, App Check, and Machine Learning — configured once from `app-config.yaml` and available anywhere via `@Inject(BEAN_TOKEN)`.

For anything beyond these eight services, or for lower-level access, you can always resolve `firebase-admin`'s top-level `admin` module directly and call `admin.app()` yourself; the starter's job is to remove the repetitive initialization/wiring for the common cases.

## 📚 Resources

-   [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
-   [Firebase Authentication](https://firebase.google.com/docs/auth/admin)
-   [Cloud Firestore](https://firebase.google.com/docs/firestore)
-   [Cloud Storage](https://firebase.google.com/docs/storage)
-   [Realtime Database](https://firebase.google.com/docs/database/admin/start)
-   [Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging)
-   [Remote Config](https://firebase.google.com/docs/remote-config)
-   [App Check](https://firebase.google.com/docs/app-check)
-   [Machine Learning](https://firebase.google.com/docs/ml)
-   [`@nodeboot/authorization`](https://github.com/nodejs-boot/node-boot/tree/main/packages/authorization)
