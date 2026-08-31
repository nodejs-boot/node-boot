import {Component} from "@nodeboot/core";
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {FastifyReply, FastifyRequest} from "fastify";

@Component()
export class TestAuthorizationChecker implements AuthorizationChecker<FastifyRequest, FastifyReply> {
    async check(action: Action<FastifyRequest, FastifyReply>, roles: string[]): Promise<boolean> {
        const role = action.request.headers["x-role"];
        if (!role) return false;
        if (roles.length === 0) return true;
        return roles.includes(role as string);
    }
}
