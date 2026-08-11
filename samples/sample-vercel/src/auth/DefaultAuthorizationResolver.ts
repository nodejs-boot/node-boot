import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {VercelRequest, VercelResponse} from "@nodeboot/vercel-server";
import {Logger} from "winston";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<VercelRequest, VercelResponse> {
    @Inject()
    private logger: Logger;

    async check(action: Action<VercelRequest, VercelResponse>, roles: string[]): Promise<boolean> {
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
