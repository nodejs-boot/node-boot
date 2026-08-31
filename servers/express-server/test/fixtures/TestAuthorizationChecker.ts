import {Component} from "@nodeboot/core";
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {Request, Response} from "express";

@Component()
export class TestAuthorizationChecker implements AuthorizationChecker<Request, Response> {
    async check(action: Action<Request, Response>, roles: string[]): Promise<boolean> {
        const role = action.request.headers["x-role"];
        if (!role) return false;
        if (roles.length === 0) return true;
        return roles.includes(role as string);
    }
}
