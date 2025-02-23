import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {remoteConfig} from "firebase-admin";
import {Inject} from "typedi";
import {FIREBASE_REMOTE_CONFIG_BEAN} from "@nodeboot/starter-firebase";

@Service()
export class FirebaseService {
    constructor(
        private readonly logger: Logger,
        @Inject(FIREBASE_REMOTE_CONFIG_BEAN)
        private readonly firebaseRemoteConfig: remoteConfig.RemoteConfig,
    ) {}

    public callFirebase() {
        this.logger.info(`Calling Firebase`);

        this.firebaseRemoteConfig.listVersions().then(result => {
            this.logger.info(`Remote config versions ${result.versions.length}`);
        });
    }
}
