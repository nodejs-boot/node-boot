import {ApplicationContext, AuthorizationChecker, CurrentUserChecker} from "@node-boot/context";

/**
 * Enable Authorization features by providing an Authorization and current user resolvers.
 *
 * @param CurrentUserCheckerClass class implementing CurrentUserResolver interface
 * @param AuthorizationCheckerClass class implementing AuthorizationResolver interface
 */
export function EnableAuthorization(
    CurrentUserCheckerClass?: new () => CurrentUserChecker,
    AuthorizationCheckerClass?: new () => AuthorizationChecker,
): Function {
    return function (object: Function) {
        if (AuthorizationCheckerClass) {
            ApplicationContext.get().authorizationChecker = new AuthorizationCheckerClass();
        }

        if (CurrentUserCheckerClass) {
            ApplicationContext.get().currentUserChecker = new CurrentUserCheckerClass();
        }
    };
}
