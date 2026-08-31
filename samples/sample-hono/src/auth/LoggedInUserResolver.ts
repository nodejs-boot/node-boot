import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "@nodeboot/hono-server";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<HonoRequest, HonoResponse> {
    @Inject()
    private logger: Logger;

    async check(_action: Action<HonoRequest, HonoResponse>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        // Your logic to fetch the current user from the request, database, or any other source
        // For example, you might want to retrieve user info from a session, token, or database
        return {
            id: 1,
            username: "exampleUser",
            // ... other user properties
        };
    }
}
