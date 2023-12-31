import {Component} from "@node-boot/core";
import {Action, CurrentUserChecker} from "@node-boot/context";
import {Request, Response} from "express";
import {Inject} from "@node-boot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<Request, Response> {
    @Inject()
    private logger: Logger;

    async check(action: Action<Request, Response>): Promise<any> {
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
