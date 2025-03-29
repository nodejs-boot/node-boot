import {OpenAIConfiguration} from "../config";

/**
 * Enables OpenAI in the NodeBoot service.
 * When applied to the Application class, it ensures that OpenAIConfiguration is instantiated.
 *
 * @returns {ClassDecorator} A class decorator that initializes OpenAI configuration.
 *
 * @example
 * import "reflect-metadata";
 * import { Container } from "typedi";
 * import { NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView } from "@nodeboot/core";
 * import { ExpressServer } from "@nodeboot/express-server";
 * import { EnableDI } from "@nodeboot/di";
 * import { EnableComponentScan } from "@nodeboot/scan";
 * import { EnableOpenAI } from "@nodeboot/starter-openai";
 *
 * @EnableDI(Container)
 * @EnableOpenAI()
 * @EnableComponentScan()
 * @NodeBootApplication()
 * export class SampleApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 */
export const EnableOpenAI = (): ClassDecorator => {
    return () => {
        new OpenAIConfiguration();
    };
};
