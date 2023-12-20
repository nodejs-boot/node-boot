import {Action, CurrentUserChecker} from "@node-boot/context";
import {Component} from "@node-boot/core";
import {Request, Response} from "koa";
import {User} from "../interfaces/users.interface";
import {Inject} from "@node-boot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<Request, Response> {
    @Inject()
    private logger: Logger;

    async check(action: Action<Request, Response>): Promise<User> {
        this.logger.info(`Checking current logged in user`);

        // Your logic to fetch the current user from the request, database, or any other source
        // For example, you might want to retrieve user info from a session, token, or database
        action.request;
        return {
            id: 1,
            email: "user@example.com",
            // ... other user properties
        };
    }
}
