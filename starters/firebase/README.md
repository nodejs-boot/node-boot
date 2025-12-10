# @nodeboot/starter-firebase Documentation

## Overview

`@nodeboot/starter-firebase` seamlessly integrates Firebase services into your Node.js application using the Node-Boot framework. Drawing inspiration from Spring Boot's auto-configuration, this package simplifies Firebase setup by:

-   **Auto-configuring Firebase Services**: Automatically initializes Firebase services based on your configuration.
-   **Dependency Injection (DI) Support**: Provides ready-to-use Firebase service instances as beans in the DI container.
-   **Centralized Configuration**: Reads settings from an `app-config.yaml` file, promoting an opinionated and consistent configuration approach.

## Installation

Install the package via npm:

```bash
npm install @nodeboot/starter-firebase
```

## Configuration

To enable Firebase integration, add your Firebase settings to the `app-config.yaml` file under the `integrations.firebase` path.

### Example `app-config.yaml`:

```yaml
integrations:
    firebase:
        serviceAccount: "./path/to/firebase.service-account.json"
        realtimeDatabaseUrl: "https://<your-database-name>.firebaseio.com"
        storageBucket: "<your-storage-bucket>.appspot.com"
        projectId: "<your-project-id>"
```

**Configuration Properties:**

-   `serviceAccount` (string): Path to your Firebase service account JSON file. [Learn more](https://firebase.google.com/docs/admin/setup#initialize-sdk).
-   `realtimeDatabaseUrl` (string): URL of your Firebase Realtime Database. [Learn more](https://firebase.google.com/docs/database/admin/start).
-   `storageBucket` (string): Name of your Google Cloud Storage bucket (without `gs://` prefix). [Learn more](https://firebase.google.com/docs/storage/admin/start).
-   `projectId` (string): ID of your Google Cloud project. [Learn more](https://firebase.google.com/docs/projects/learn-more).

## Enabling Firebase Integration

In your main application class, apply the `@EnableFirebase` decorator to activate Firebase auto-configuration:

```typescript
import {EnableFirebase} from "@nodeboot/starter-firebase";
import {NodeBootApplication, NodeBootApp} from "@nodeboot/core";
import {EnableDI, EnableComponentScan} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express";
import {Container} from "typedi";

@EnableDI(Container)
@EnableFirebase()
@EnableComponentScan()
@NodeBootApplication()
export class MyApp implements NodeBootApp {
    start(): Promise<void> {
        return NodeBoot.run(ExpressServer);
    }
}
```

## Accessing Firebase Services

With auto-configuration enabled, you can inject Firebase services into your components using the DI container.

### Example Service:

```typescript
import {Service, Inject} from "@nodeboot/core";
import {FIREBASE_MACHINE_LEARNING_BEAN} from "@nodeboot/starter-firebase";
import {Logger} from "winston";
import {remoteConfig} from "firebase-admin";

@Service()
export class FirebaseService {
    constructor(
        private readonly logger: Logger,
        @Inject(FIREBASE_MACHINE_LEARNING_BEAN)
        private readonly firebaseRemoteConfig: remoteConfig.RemoteConfig,
    ) {}

    public async fetchRemoteConfigVersions() {
        this.logger.info("Fetching Firebase Remote Config versions...");

        try {
            const result = await this.firebaseRemoteConfig.listVersions();
            this.logger.info(`Retrieved ${result.versions.length} versions.`);
        } catch (error) {
            this.logger.error("Error fetching Remote Config versions:", error);
        }
    }
}
```

**Available Firebase Beans:**

-   `firebase.auth`: [Firebase Authentication](https://firebase.google.com/docs/auth/admin)
-   `firebase.firestore`: [Cloud Firestore](https://firebase.google.com/docs/firestore)
-   `firebase.storage`: [Cloud Storage](https://firebase.google.com/docs/storage)
-   `firebase.realtime-database`: [Realtime Database](https://firebase.google.com/docs/database/admin/start)
-   `firebase.messaging`: [Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging)
-   `firebase.remote-config`: [Remote Config](https://firebase.google.com/docs/remote-config)
-   `firebase.app-check`: [App Check](https://firebase.google.com/docs/app-check)
-   `firebase.machine-learning`: [Machine Learning](https://firebase.google.com/docs/ml)

## Logging

The package utilizes a logger to provide informative messages during the initialization and injection of Firebase services.

If the `serviceAccount` path is not provided or incorrect, the initialization will log an error:

```
No configuration provided for Firebase integration. Please configure "integrations.firebase.serviceAccount=./path/to/firebase.service-account.json"
```

Ensure that your `app-config.yaml` is correctly set up and the service account file is accessible.

## Conclusion

`@nodeboot/starter-firebase` streamlines the integration of Firebase services into your Node.js application by leveraging Node-Boot's auto-configuration and DI capabilities. With minimal setup, you can access and utilize Firebase services efficiently.

For more detailed information on each Firebase service, refer to the official [Firebase Documentation](https://firebase.google.com/docs).
