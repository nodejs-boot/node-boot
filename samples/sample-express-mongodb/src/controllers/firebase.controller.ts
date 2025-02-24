import {Controller, Post} from "@nodeboot/core";
import {Logger} from "winston";
import {FirebaseService} from "../services/firebase.service";

@Controller("/firebase", "v1")
export class FirebaseController {
    constructor(private readonly firebaseService: FirebaseService, private readonly logger: Logger) {}

    @Post("/auth")
    async callAuth() {
        this.logger.info(`Calling auth from firebase`);
        this.firebaseService.callFirebase();
    }
}
