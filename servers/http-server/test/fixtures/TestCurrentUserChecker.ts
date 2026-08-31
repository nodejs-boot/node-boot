import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {IncomingMessage, ServerResponse} from "node:http";

@Component()
export class TestCurrentUserChecker implements CurrentUserChecker<IncomingMessage, ServerResponse> {
    async check(_action: Action<IncomingMessage, ServerResponse>): Promise<any> {
        return {id: 1, name: "Test User"};
    }
}
