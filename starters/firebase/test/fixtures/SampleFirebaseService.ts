import {Service} from "@nodeboot/core";
import {Inject} from "typedi";
import {appCheck, auth, database, firestore, machineLearning, messaging, remoteConfig, storage} from "firebase-admin";
import {
    FIREBASE_APP_CHECK_BEAN,
    FIREBASE_AUTH_BEAN,
    FIREBASE_FIRESTORE_BEAN,
    FIREBASE_MACHINE_LEARNING_BEAN,
    FIREBASE_MESSAGING_BEAN,
    FIREBASE_REALTIME_DATABASE_BEAN,
    FIREBASE_REMOTE_CONFIG_BEAN,
    FIREBASE_STORAGE_BEAN,
} from "../../src";

/**
 * Sample service demonstrating injection and usage of all 8 Firebase Admin services
 * auto-configured by `@nodeboot/starter-firebase`.
 */
@Service()
export class SampleFirebaseService {
    constructor(
        @Inject(FIREBASE_AUTH_BEAN)
        public readonly authClient: auth.Auth,
        @Inject(FIREBASE_FIRESTORE_BEAN)
        public readonly firestoreClient: firestore.Firestore,
        @Inject(FIREBASE_STORAGE_BEAN)
        public readonly storageClient: storage.Storage,
        @Inject(FIREBASE_REALTIME_DATABASE_BEAN)
        public readonly realtimeDbClient: database.Database,
        @Inject(FIREBASE_MESSAGING_BEAN)
        public readonly messagingClient: messaging.Messaging,
        @Inject(FIREBASE_REMOTE_CONFIG_BEAN)
        public readonly remoteConfigClient: remoteConfig.RemoteConfig,
        @Inject(FIREBASE_APP_CHECK_BEAN)
        public readonly appCheckClient: appCheck.AppCheck,
        @Inject(FIREBASE_MACHINE_LEARNING_BEAN)
        public readonly machineLearningClient: machineLearning.MachineLearning,
    ) {}

    // Auth Operations
    async createCustomToken(uid: string, claims?: object): Promise<string> {
        return this.authClient.createCustomToken(uid, claims);
    }

    async getUser(uid: string): Promise<auth.UserRecord> {
        return this.authClient.getUser(uid);
    }

    // Storage Operations
    getBucketName(): string {
        return this.storageClient.bucket().name;
    }

    getFileRef(path: string): ReturnType<ReturnType<storage.Storage["bucket"]>["file"]> {
        return this.storageClient.bucket().file(path);
    }

    // Firestore Operations
    getDocRef(collection: string, docId: string): firestore.DocumentReference {
        return this.firestoreClient.collection(collection).doc(docId);
    }

    // Realtime Database Operations
    getDbRef(path: string): database.Reference {
        return this.realtimeDbClient.ref(path);
    }

    // App Check Operations
    async createAppCheckToken(appId: string): Promise<appCheck.AppCheckToken> {
        return this.appCheckClient.createToken(appId);
    }
}
