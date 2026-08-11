import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {CloudflareContext, CloudflareRequest} from "@nodeboot/cloudflare-server";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<CloudflareRequest, CloudflareContext> {
    @Inject("logger")
    private logger: Logger;

    async check(_action: Action<CloudflareRequest, CloudflareContext>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        // Replace with logic to resolve the current user from the incoming request
        // (e.g. decoding a JWT, or reading a claim injected by Cloudflare Access).
        return {
            id: 1,
            username: "exampleUser",
        };
    }
}
