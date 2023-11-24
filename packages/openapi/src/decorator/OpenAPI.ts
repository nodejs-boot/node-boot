import {OpenAPI as InnerOpenAPI} from "routing-controllers-openapi";

/**
 * Supplement action with additional OpenAPI Operation keywords.
 *
 * @param args Arguments for routing-controllers-openapi @OpenAPI decorator:
 *  <br/>- OpenAPI Operation object that is merged into the schema derived
 * from routing-controllers decorators. In case of conflicts, keywords defined
 * here overwrite the existing ones. Alternatively you can supply a function
 * that receives as parameters the existing Operation and target route,
 * returning an updated Operation.
 */
export function OpenAPI(...args: Parameters<typeof InnerOpenAPI>) {
    return <TFunction extends Function>(
        ...innerArgs: [Function] | [object, string, PropertyDescriptor]
    ) => {
        InnerOpenAPI(...args)(...innerArgs);
    };
}
