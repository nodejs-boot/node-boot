import {BackstageConfiguration} from "../config";

/**
 * EnableBackstage Decorator
 *
 * This decorator enables Backstage integration in a NodeBoot application.
 * When applied to the Application class, it ensures that BackstageConfiguration is instantiated.
 *
 * @returns {ClassDecorator} - A decorator function to enable Backstage.
 *
 * @example
 * import "reflect-metadata";
 * import { NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView } from "@nodeboot/core";
 * import { ExpressServer } from "@nodeboot/express-server";
 * import { EnableComponentScan } from "@nodeboot/scan";
 * import { EnableBackstage } from "@nodeboot/starter-backstage";
 *
 * @EnableBackstage()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class SampleApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 */
export const EnableBackstage = (): ClassDecorator => {
    return () => {
        new BackstageConfiguration();
    };
};
