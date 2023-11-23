import { RequestContext } from "@node-boot/context";

/**
 * Special function used to get currently authorized user.
 */
export interface CurrentUserResolver {
  getCurrentUser(context: RequestContext): Promise<any> | any;
}
