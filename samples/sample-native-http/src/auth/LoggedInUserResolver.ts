import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    async check(action: Action<IncomingMessage, ServerResponse>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        // Your logic to fetch the current user from the request, database, or any other source
        // For example, you might want to retrieve user info from a session, token, or database
        action.request;
        return {
            id: 1,
            username: "exampleUser",
            // ... other user properties
        };
    }
}
