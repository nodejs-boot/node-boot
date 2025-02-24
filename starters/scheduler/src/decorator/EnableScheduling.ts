import {ApplicationContext} from "@nodeboot/context";
import {SCHEDULING_FEATURE} from "../types";

/**
 * Enables scheduling in a Node-Boot application.
 *
 * This decorator activates the scheduling feature by setting the corresponding flag
 * in the `ApplicationContext`. When applied to the main application class, it allows
 * methods decorated with `@Scheduler` to be executed according to their cron expressions.
 *
 * @returns {ClassDecorator} A decorator that enables the scheduling feature.
 *
 * @example
 * ```typescript
 * @EnableScheduling()
 * @NodeBootApplication()
 * export class SampleApp implements NodeBootApp {
 *     start(): Promise<NodeBootAppView> {
 *         return NodeBoot.run(ExpressServer);
 *     }
 * }
 * ```
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export const EnableScheduling = (): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;
    };
};
