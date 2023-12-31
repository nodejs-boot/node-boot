import {Action} from "./types";

/**
 * Special function used to check user authorization roles per request.
 * Must return true or promise with boolean true resolved for authorization to succeed.
 */
export interface AuthorizationChecker<TRequest = unknown, TResponse = unknown, TRole = string> {
    check(action: Action<TRequest, TResponse>, roles: TRole[]): Promise<boolean> | boolean;
}

/**
 * Special function used to get currently authorized user.
 */
export interface CurrentUserChecker<TRequest = unknown, TResponse = unknown> {
    check(action: Action<TRequest, TResponse>): Promise<any> | any;
}

export interface RoleChecker<TRequest = unknown, TResponse = unknown> {
    check(action: Action<TRequest, TResponse>): boolean | Promise<boolean>;
}
