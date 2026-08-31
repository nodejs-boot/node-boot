import {Component} from "@nodeboot/core";
import {Action, AuthorizationChecker} from "@nodeboot/context";
import {HonoRequest, HonoResponse} from "../../src";

/**
 * Reads the role from an `x-role` header set by the test client, so both the "authorized" and
 * "forbidden" paths can be exercised without a real identity provider.
 */
@Component()
export class TestAuthorizationChecker implements AuthorizationChecker<HonoRequest, HonoResponse> {
    async check(action: Action<HonoRequest, HonoResponse>, roles: string[]): Promise<boolean> {
        const role = action.request.headers.get("x-role");
        if (!role) return false;
        if (roles.length === 0) return true;
        return roles.includes(role);
    }
}
