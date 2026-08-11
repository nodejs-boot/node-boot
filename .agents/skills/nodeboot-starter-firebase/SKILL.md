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
