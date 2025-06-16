import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<IncomingMessage, ServerResponse> {
    @Inject()
    private logger: Logger;

    async check(_: Action<IncomingMessage, ServerResponse>, roles: string[]): Promise<boolean> {
        // here you can use request/response objects from action
        // also if decorator defines roles it needs to access the action
        // you can use them to provide granular access check
        // checker must return either boolean (true or false)
        // either promise that resolves a boolean value
        // demo code:
        this.logger.info(`Checking authorization`);
        //const user = await getEntityManager().findOneByToken(User, token);
        const user = {
            roles: ["USER", "ADMIN"],
        };
        if (user && !roles.length) return true;
        return user && roles.find(role => user.roles.indexOf(role) !== -1) !== undefined;
    }
}
