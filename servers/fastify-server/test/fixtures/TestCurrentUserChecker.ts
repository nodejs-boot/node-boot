import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {FastifyReply, FastifyRequest} from "fastify";

@Component()
export class TestCurrentUserChecker implements CurrentUserChecker<FastifyRequest, FastifyReply> {
    async check(_action: Action<FastifyRequest, FastifyReply>): Promise<any> {
        return {id: 1, name: "Test User"};
    }
}
