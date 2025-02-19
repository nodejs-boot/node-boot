import {ApplicationContext, AuthorizationChecker, CurrentUserChecker} from "@nodeboot/context";

/**
 * Enable Authorization features by providing an Authorization and current user resolvers.
 *
 * @param currentUserCheckerClass class implementing CurrentUserResolver interface
 * @param authorizationCheckerClass class implementing AuthorizationResolver interface
 */
export function EnableAuthorization(
    currentUserCheckerClass?: new () => CurrentUserChecker,
    authorizationCheckerClass?: new () => AuthorizationChecker,
): Function {
    return function () {
        if (authorizationCheckerClass) {
            ApplicationContext.get().authorizationChecker = authorizationCheckerClass;
        }

        if (currentUserCheckerClass) {
            ApplicationContext.get().currentUserChecker = currentUserCheckerClass;
        }
    };
}
