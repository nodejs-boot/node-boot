export const FIREBASE_AUTH_BEAN = "firebase.auth";
export const FIREBASE_FIRESTORE_BEAN = "firebase.firestore";
export const FIREBASE_STORAGE_BEAN = "firebase.storage";
export const FIREBASE_REALTIME_DATABASE_BEAN = "firebase.realtime-database";
export const FIREBASE_MESSAGING_BEAN = "firebase.messaging";
export const FIREBASE_REMOTE_CONFIG_BEAN = "firebase.remote-config";
export const FIREBASE_APP_CHECK_BEAN = "firebase.app-check";
export const FIREBASE_MACHINE_LEARNING_BEAN = "firebase.machine-learning";

/**
 * Firebase Integration Configuration
 *
 * This configuration type defines the necessary parameters for integrating Firebase services
 * within a Node-Boot application. It is typically loaded from the application's configuration
 * file (e.g., `app-config.yaml`) under the `integrations.firebase` path.
 *
 * These settings allow the Firebase Admin SDK to authenticate and interact with various Firebase
 * services, such as Firestore, Realtime Database, Cloud Storage, Authentication, and more.
 *
 * ## Example Configuration (YAML):
 * ```yaml
 * integrations:
 *   firebase:
 *     serviceAccount: "./firebase-service-account.json"
 *     realtimeDatabaseUrl: "https://your-project-id.firebaseio.com"
 *     serviceAccountId: "your-service-account@your-project.iam.gserviceaccount.com"
 *     storageBucket: "your-project.appspot.com"
 *     projectId: "your-project-id"
 * ```
 *
 * ## Usage:
 * The `FirebaseIntegrationConfig` is automatically injected into the `FirebaseAdminConfiguration`
 * class, ensuring that Firebase services are correctly initialized with the provided settings.
 *
 * ```typescript
 * const serviceAccountConfig = config.get<FirebaseIntegrationConfig>("integrations.firebase");
 * ```
 */
export type FirebaseIntegrationConfig = {
    /**
     * Path to the Firebase service account configuration file.
     *
     * This file contains credentials required for authenticating with Firebase.
     * The path should point to a `.json` file that follows Google's service account format.
     *
     * @see https://firebase.google.com/docs/admin/setup#initialize-sdk
     */
    serviceAccount?: string;

    /**
     * The URL of the Firebase Realtime Database instance.
     *
     * This URL is used for reading and writing data to Firebase's NoSQL database in real time.
     *
     * @example "https://your-project-id.firebaseio.com"
     * @see https://firebase.google.com/docs/database/admin/start
     */
    realtimeDatabaseUrl?: string;

    /**
     * The service account ID used for signing custom authentication tokens.
     *
     * This can be found in the `client_email` field of the Firebase service account JSON file.
     * Required when generating authentication tokens for Firebase Authentication.
     *
     * @example "your-service-account@your-project.iam.gserviceaccount.com"
     * @see https://firebase.google.com/docs/auth/admin/create-custom-tokens
     */
    serviceAccountId?: string;

    /**
     * The Google Cloud Storage bucket name used for storing application data.
     *
     * This should be specified without the `gs://` prefix.
     *
     * @example "your-project.appspot.com"
     * @see https://firebase.google.com/docs/storage/admin/start
     */
    storageBucket?: string;

    /**
     * The Google Cloud project ID associated with the Firebase application.
     *
     * This is used for associating Firebase services with the correct project.
     *
     * @example "your-project-id"
     * @see https://firebase.google.com/docs/projects/learn-more
     */
    projectId?: string;
};
