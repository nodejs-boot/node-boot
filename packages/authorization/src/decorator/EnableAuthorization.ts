import {ApplicationContext, RequestContext} from "@node-boot/context";
import {AuthorizationResolver, CurrentUserResolver} from "../resolver";
import {Action} from "routing-controllers/types/Action";

/**
 * Enable Authorization features by providing an Authorization and current user resolvers.
 *
 * @param CurrentUserResolverClass class implementing CurrentUserResolver interface
 * @param AuthorizationResolverClass class implementing AuthorizationResolver interface
 */
export function EnableAuthorization(
    CurrentUserResolverClass?: new () => CurrentUserResolver,
    AuthorizationResolverClass?: new () => AuthorizationResolver,
): Function {
    return function (object: Function) {
        if (AuthorizationResolverClass) {
            const authResolver = new AuthorizationResolverClass();
            ApplicationContext.get().authorizationChecker = async (
                context: RequestContext,
                roles: any[],
            ) => {
                return authResolver.authorize(context, roles);
            };
        }

        if (CurrentUserResolverClass) {
            const userResolver = new CurrentUserResolverClass();
            ApplicationContext.get().currentUserChecker = async (
                action: Action,
            ) => {
                return userResolver.getCurrentUser(action);
            };
        }
    };
}
