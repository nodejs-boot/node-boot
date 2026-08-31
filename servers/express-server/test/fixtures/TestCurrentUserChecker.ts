import {Component} from "@nodeboot/core";
import {Action, CurrentUserChecker} from "@nodeboot/context";
import {Request, Response} from "express";

@Component()
export class TestCurrentUserChecker implements CurrentUserChecker<Request, Response> {
    async check(_action: Action<Request, Response>): Promise<any> {
        return {id: 1, name: "Test User"};
    }
}
