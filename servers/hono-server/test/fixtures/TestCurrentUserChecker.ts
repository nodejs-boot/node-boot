import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "../../src";

@Component()
export class TestCurrentUserChecker implements CurrentUserChecker<HonoRequest, HonoResponse> {
    async check(_action: Action<HonoRequest, HonoResponse>): Promise<any> {
        return {id: 1, name: "Test User"};
    }
}
