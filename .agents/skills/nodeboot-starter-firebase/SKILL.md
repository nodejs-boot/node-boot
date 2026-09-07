---
name: nodeboot-starter-firebase
description: Use when the user wants Firebase Admin integration in a Node-Boot app with `@nodeboot/starter-firebase`; this starter is enabled with `@EnableFirebase()` and exposes named beans for Firebase auth, Firestore, storage, realtime database, messaging, remote config, app check, and machine learning from `integrations.firebase`.
---

# `@nodeboot/starter-firebase`

Use this starter when a Node-Boot app should initialize Firebase Admin once and inject Firebase services as beans. It follows the multi-bean factory pattern: one `@EnableFirebase()` switch, then multiple named `FIREBASE_*_BEAN` injections.

## Enable

```ts
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

## Minimal injection example

```ts
@Service()
export class TodoService {
    constructor(
        @Inject(FIREBASE_FIRESTORE_BEAN)
        private readonly firestoreClient: firestore.Firestore,
    ) {}
}
```

Available named beans include `FIREBASE_AUTH_BEAN`, `FIREBASE_FIRESTORE_BEAN`, `FIREBASE_STORAGE_BEAN`, `FIREBASE_REALTIME_DATABASE_BEAN`, and `FIREBASE_MESSAGING_BEAN`.

## Key config

```yaml
integrations:
    firebase:
        serviceAccount: "./firebase-service-account.json"
        realtimeDatabaseUrl: "https://your-project-id.firebaseio.com"
        storageBucket: "your-project.appspot.com"
        serviceAccountId: "your-service-account@your-project.iam.gserviceaccount.com"
        projectId: "your-project-id"
```

Full docs: [`starters/firebase/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/starters/firebase/README.md)

## Validate

`cd starters/firebase && pnpm test`

For automated proof that `@EnableFirebase()` actually autowires, see
`test/firebase-enabled.it.test.ts`: a `useNodeBoot()`-booted app (on `@nodeboot/ghost-server`)
asserting the Auth/Firestore beans resolve real Admin SDK service objects. Uses a synthetic,
non-Google-issued RSA key pair for the service account - `admin.credential.cert()` only validates
the key is well-formed PEM, it never contacts Google. No negative counterpart: without
`integrations.firebase` config, the other `@Bean` methods on the same class still run
unconditionally and throw calling `admin.auth()`/`admin.database()` without an initialized app - a
boot-time crash, not a graceful disabled path. See `nodeboot-extending-nodeboot`'s "Testing a
starter package" section before writing this style of test for a different starter.
