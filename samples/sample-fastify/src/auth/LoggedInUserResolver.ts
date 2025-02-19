import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {FastifyRequest} from "fastify/types/request";
import {FastifyReply} from "fastify/types/reply";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<FastifyRequest, FastifyReply> {
    @Inject()
    private logger: Logger;

    async check(action: Action<FastifyRequest, FastifyReply>): Promise<any> {
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
