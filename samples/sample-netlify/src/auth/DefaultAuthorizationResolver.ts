import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {HandlerContext, HandlerEvent} from "@nodeboot/netlify-server";
import {Logger} from "winston";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<HandlerEvent, HandlerContext> {
    @Inject()
    private logger: Logger;

    async check(action: Action<HandlerEvent, HandlerContext>, roles: string[]): Promise<boolean> {
        this.logger.info(`Checking authorization`);

        // Replace with real token/claims validation, e.g. verifying a JWT from the
        // Authorization header.
        const token = action.request.headers["authorization"];
        const user = token ? {roles: ["USER", "ADMIN"]} : undefined;

        if (user && !roles.length) return true;
        if (user && roles.find(role => user.roles.includes(role))) return true;
        return false;
    }
}
