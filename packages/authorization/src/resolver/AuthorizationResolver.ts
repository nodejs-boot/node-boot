import {RequestContext} from "@node-boot/context";

/**
 * Special function used to resolver user authorization roles per request.
 * Must return true or promise with boolean true resolved for authorization to succeed.
 */
export interface AuthorizationResolver {
    authorize(context: RequestContext, roles: any[]): Promise<boolean> | boolean;
}
