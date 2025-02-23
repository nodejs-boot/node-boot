import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import admin, {
    appCheck,
    auth,
    database,
    firestore,
    machineLearning,
    messaging,
    remoteConfig,
    storage,
} from "firebase-admin";
import {
    FIREBASE_APP_CHECK_BEAN,
    FIREBASE_AUTH_BEAN,
    FIREBASE_FIRESTORE_BEAN,
    FIREBASE_MACHINE_LEARNING_BEAN,
    FIREBASE_MESSAGING_BEAN,
    FIREBASE_REALTIME_DATABASE_BEAN,
    FIREBASE_REMOTE_CONFIG_BEAN,
    FIREBASE_STORAGE_BEAN,
    FirebaseIntegrationConfig,
} from "../types";

/**
 * Configuration class responsible for initializing Firebase services
 * and exposing them as injectable beans in the Node-Boot DI container.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
@Configuration()
export class FirebaseAdminConfiguration {
    /**
     * Initializes the Firebase Admin SDK based on the application configuration.
     * Reads the Firebase credentials and project settings from the `app-config.yaml` file.
     *
     * @param {BeansContext} context - The DI context containing logger and configuration utilities.
     */
    @Bean()
    public initFirebase({logger, config}: BeansContext) {
        logger.info("Initializing Firebase Admin client");

        // Retrieve Firebase configuration from the app's configuration file
        const serviceAccountConfig = config.get<FirebaseIntegrationConfig>("integrations.firebase");

        if (serviceAccountConfig) {
            if (serviceAccountConfig.serviceAccount) {
                const credentials = admin.credential.cert(serviceAccountConfig.serviceAccount);

                // Initialize Firebase with credentials and additional settings
                admin.initializeApp({
                    credential: credentials,
                    databaseURL: serviceAccountConfig.realtimeDatabaseUrl,
                    storageBucket: serviceAccountConfig.storageBucket,
                    serviceAccountId: serviceAccountConfig.serviceAccountId,
                    projectId: serviceAccountConfig.projectId,
                });

                logger.info("🔥 Firebase Client successfully configured");
            } else {
                logger.error(`No configuration provided for Firebase integration. 
                Please configure "integrations.firebase.serviceAccount=./path/to/firebase.service-account.json"`);
            }
        } else {
            logger.warn(`You've enabled Firebase using @EnableFirebase, but no configuration 
            was provided under "integrations.firebase" in the app-config.yaml.`);
        }
    }

    /**
     * Provides Firebase Authentication service as a DI bean.
     * Used for managing users, tokens, and authentication-related tasks.
     *
     * @returns {auth.Auth} - Firebase Authentication instance.
     */
    @Bean(FIREBASE_AUTH_BEAN)
    public firebaseAuth({logger}: BeansContext): auth.Auth {
        logger.info("🔐 Injecting Firebase Authentication Service");
        return admin.auth();
    }

    /**
     * Provides Firestore Database service as a DI bean.
     * Used for storing and retrieving structured NoSQL data.
     *
     * @returns {firestore.Firestore} - Firestore database instance.
     */
    @Bean(FIREBASE_FIRESTORE_BEAN)
    public firestoreClient({logger}: BeansContext): firestore.Firestore {
        logger.info("📂 Injecting Firebase Firestore Service");
        return admin.firestore();
    }

    /**
     * Provides Firebase Cloud Storage service as a DI bean.
     * Used for storing and retrieving files such as images, videos, and documents.
     *
     * @returns {storage.Storage} - Firebase Cloud Storage instance.
     */
    @Bean(FIREBASE_STORAGE_BEAN)
    public firebaseStorage({logger}: BeansContext): storage.Storage {
        logger.info("🗄️ Injecting Firebase Storage Service");
        return admin.storage();
    }

    /**
     * Provides Firebase Realtime Database service as a DI bean.
     * Used for real-time data synchronization across multiple clients.
     *
     * @returns {database.Database} - Firebase Realtime Database instance.
     */
    @Bean(FIREBASE_REALTIME_DATABASE_BEAN)
    public realtimeDatabase({logger}: BeansContext): database.Database {
        logger.info("⚡ Injecting Firebase Realtime Database");
        return admin.database();
    }

    /**
     * Provides Firebase Cloud Messaging (FCM) service as a DI bean.
     * Used for sending push notifications and messages to devices.
     *
     * @returns {messaging.Messaging} - Firebase Cloud Messaging instance.
     */
    @Bean(FIREBASE_MESSAGING_BEAN)
    public firebaseMessaging({logger}: BeansContext): messaging.Messaging {
        logger.info("📢 Injecting Firebase Cloud Messaging (FCM)");
        return admin.messaging();
    }

    /**
     * Provides Firebase Remote Config service as a DI bean.
     * Used for remotely configuring and updating app behavior dynamically.
     *
     * @returns {remoteConfig.RemoteConfig} - Firebase Remote Config instance.
     */
    @Bean(FIREBASE_REMOTE_CONFIG_BEAN)
    public firebaseRemoteConfig({logger}: BeansContext): remoteConfig.RemoteConfig {
        logger.info("🛠️ Injecting Firebase Remote Config");
        return admin.remoteConfig();
    }

    /**
     * Provides Firebase App Check service as a DI bean.
     * Used to protect backend resources from abuse by verifying app authenticity.
     *
     * @returns {appCheck.AppCheck} - Firebase App Check instance.
     */
    @Bean(FIREBASE_APP_CHECK_BEAN)
    public firebaseAppCheck({logger}: BeansContext): appCheck.AppCheck {
        logger.info("✅ Injecting Firebase App Check");
        return admin.appCheck();
    }

    /**
     * Provides Firebase Machine Learning service as a DI bean.
     * Used for AI/ML capabilities like text recognition, image labeling, and more.
     *
     * @returns {machineLearning.MachineLearning} - Firebase Machine Learning instance.
     */
    @Bean(FIREBASE_MACHINE_LEARNING_BEAN)
    public firebaseMachineLearning({logger}: BeansContext): machineLearning.MachineLearning {
        logger.info("🤖 Injecting Firebase Machine Learning");
        return admin.machineLearning();
    }
}
