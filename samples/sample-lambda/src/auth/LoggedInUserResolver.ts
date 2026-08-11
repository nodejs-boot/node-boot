import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {APIGatewayProxyEvent, Context} from "aws-lambda";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<APIGatewayProxyEvent, Context> {
    @Inject()
    private logger: Logger;

    async check(_action: Action<APIGatewayProxyEvent, Context>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        // Replace with logic to resolve the current user from the incoming request
        // (e.g. decoding a JWT, or reading `event.requestContext.authorizer.claims`).
        return {
            id: 1,
            username: "exampleUser",
        };
    }
}
