import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {HandlerContext, HandlerEvent} from "@nodeboot/netlify-server";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<HandlerEvent, HandlerContext> {
    @Inject()
    private logger: Logger;

    async check(_action: Action<HandlerEvent, HandlerContext>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        // Replace with logic to resolve the current user from the incoming request
        // (e.g. decoding a JWT from the Authorization header).
        return {
            id: 1,
            username: "exampleUser",
        };
    }
}
