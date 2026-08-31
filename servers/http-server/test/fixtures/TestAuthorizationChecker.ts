import {Component} from "@nodeboot/core";
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class TestAuthorizationChecker implements AuthorizationChecker<IncomingMessage, ServerResponse> {
    async check(action: Action<IncomingMessage, ServerResponse>, roles: string[]): Promise<boolean> {
        const role = action.request.headers["x-role"];
        if (!role) return false;
        if (roles.length === 0) return true;
        return roles.includes(role as string);
    }
}
