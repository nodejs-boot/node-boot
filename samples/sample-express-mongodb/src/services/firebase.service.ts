import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {remoteConfig} from "firebase-admin";
import {Inject} from "typedi";

@Service()
export class FirebaseService {
    constructor(
        private readonly logger: Logger,
        @Inject("firebase.remote-config")
        private readonly firebaseRemoteConfig: remoteConfig.RemoteConfig,
    ) {}

    public callFirebase() {
        this.logger.info(`Calling Firebase`);

        this.firebaseRemoteConfig.listVersions().then(result => {
            this.logger.info(`Remote config versions ${result.versions.length}`);
        });
    }
}
