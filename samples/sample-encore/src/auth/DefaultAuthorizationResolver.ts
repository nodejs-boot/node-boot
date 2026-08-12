import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Component} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationChecker<IncomingMessage, ServerResponse> {
    // Encore.ts bundles with esbuild, which doesn't emit `design:type` metadata for
    // `emitDecoratorMetadata`, so property injection must use an explicit token instead of
    // relying on reflected type information.
    @Inject("logger")
    private logger: Logger;

    async check(action: Action<IncomingMessage, ServerResponse>, roles: string[]): Promise<boolean> {
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
