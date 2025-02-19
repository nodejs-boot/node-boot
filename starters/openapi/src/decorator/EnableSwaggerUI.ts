import {ApplicationContext} from "@nodeboot/context";

/**
 * Enables EnableSwaggerUI.
 * By decorating your application class with it, Node-Boot will automatically register a route for the Swagger UI that
 * uses the OpenAPI specs exposed after decorating with @EnableOpenApi. The UI is exposed at '/api-docs' path.
 *
 */
export function EnableSwaggerUI(): Function {
    return function () {
        ApplicationContext.get().swaggerUI = true;
    };
}
