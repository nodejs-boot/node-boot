import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class LoggedInUserResolver implements CurrentUserChecker<IncomingMessage, ServerResponse> {
    // Encore.ts bundles with esbuild, which doesn't emit `design:type` metadata for
    // `emitDecoratorMetadata`, so property injection must use an explicit token instead of
    // relying on reflected type information.
    @Inject("logger")
    private logger: Logger;

    async check(_action: Action<IncomingMessage, ServerResponse>): Promise<any> {
        this.logger.info(`Checking current logged in user`);

        // Replace with logic to resolve the current user from the incoming request
        // (e.g. decoding a JWT from the Authorization header).
        return {
            id: 1,
            username: "exampleUser",
        };
    }
}
