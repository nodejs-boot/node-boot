import {ApplicationContext} from "@nodeboot/context";
import {HTTP_CLIENT_FEATURE} from "../client";

/**
 * A class decorator to enable HTTP client support in a NodeBoot application.
 *
 * This decorator activates HTTP client features within the application
 * by setting the corresponding feature flag in the application context.
 *
 * ## Usage
 * Apply this decorator to a class in a NodeBoot application to enable
 * HTTP client functionality.
 *
 * @example
 * ```typescript
 * import { Container } from "typedi";
 * import { NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView } from "@nodeboot/core";
 * import { ExpressServer } from "@nodeboot/express-server";
 * import { EnableDI } from "@nodeboot/di";
 * import { EnableComponentScan } from "@nodeboot/scan";
 * import { EnableHttpClients } from "@nodeboot/starter-http";
 *
 * @EnableDI(Container)
 * @EnableHttpClients()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class SampleBackendApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * @returns {ClassDecorator} A decorator function that enables HTTP client support.
 */
export const EnableHttpClients = (): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;
    };
};
