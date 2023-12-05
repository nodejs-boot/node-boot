import {AuthorizationResolver} from "@node-boot/authorization";
import {RequestContext} from "@node-boot/context";
import {Component} from "@node-boot/core";

@Component()
export class DefaultAuthorizationResolver implements AuthorizationResolver {
    async authorize(context: RequestContext, roles: any[]): Promise<boolean> {
        // here you can use request/response objects from action
        // also if decorator defines roles it needs to access the action
        // you can use them to provide granular access check
        // checker must return either boolean (true or false)
        // either promise that resolves a boolean value
        // demo code:
        const token = context.request.headers["authorization"];

        //const user = await getEntityManager().findOneByToken(User, token);
        const user = {
            roles: ["USER", "ADMIN"],
        };
        if (user && !roles.length) return true;
        if (user && roles.find(role => user.roles.indexOf(role) !== -1)) return true;
        return false;
    }
}
