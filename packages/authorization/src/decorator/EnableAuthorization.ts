import { ApplicationContext } from "@node-boot/context";
import { AuthorizationResolver, CurrentUserResolver } from "../resolver";
import { Action } from "routing-controllers/types/Action";

/**
 * Enable Authorization features by providing an Authorization and current user resolvers.
 *
 * @param CurrentUserResolverClass class implementing CurrentUserResolver interface
 * @param AuthorizationResolverClass class implementing AuthorizationResolver interface
 */
export function EnableAuthorization(
  CurrentUserResolverClass?: new () => CurrentUserResolver,
  AuthorizationResolverClass?: new () => AuthorizationResolver
): Function {
  return function (object: Function) {
    if (AuthorizationResolverClass) {
      ApplicationContext.get().authorizationChecker =
        new AuthorizationResolverClass();
    }

    if (CurrentUserResolverClass) {
      const userResolver = new CurrentUserResolverClass();
      ApplicationContext.get().currentUserChecker = async (action: Action) => {
        return userResolver.getCurrentUser(action);
      };
    }
  };
}
