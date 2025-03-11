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
 * import { Container } from "typedi";
 * import { NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView } from "@nodeboot/core";
 * import { ExpressServer } from "@nodeboot/express-server";
 * import { EnableDI } from "@nodeboot/di";
 * import { EnableComponentScan } from "@nodeboot/scan";
 * import { EnableBackstage } from "@nodeboot/starter-backstage";
 *
 * @EnableDI(Container)
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
