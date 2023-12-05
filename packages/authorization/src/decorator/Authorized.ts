import {Authorized as InnerAuthorized} from "routing-controllers";

/**
 * Marks controller action to have a special access.
 * Authorization logic must be defined in routing-controllers settings.
 */
export function Authorized(): Function;

/**
 * Marks controller action to have a special access.
 * Authorization logic must be defined in routing-controllers settings.
 */
export function Authorized(role: any): Function;

/**
 * Marks controller action to have a special access.
 * Authorization logic must be defined in routing-controllers settings.
 */
export function Authorized(roles: any[]): Function;

/**
 * Marks controller action to have a special access.
 * Authorization logic must be defined in routing-controllers settings.
 */
export function Authorized(role: Function): Function;

/**
 * Marks controller action to have a special access.
 * Authorization logic must be defined in routing-controllers settings.
 *
 * @param roleOrRoles Arguments for routing-controllers @Authorized decorator
 */
export function Authorized(roleOrRoles?: string | string[] | Function) {
    return <TFunction extends Function>(clsOrObject: Function | Object, method?: string) => {
        // DI is optional and the decorator will only be applied if the DI container dependency is available.
        InnerAuthorized(roleOrRoles)(clsOrObject, method);
    };
}
