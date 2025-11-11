import type {NodeBootAdapter} from "./NodeBootAdapter";
import {IocContainer} from "../ioc";
import {Config, LoggerService} from "../services";

export type ApplicationFeatureContext = {
    iocContainer: IocContainer;
    config: Config;
    logger: LoggerService;
};

export interface ApplicationFeatureAdapter extends NodeBootAdapter {
    bind(context: ApplicationFeatureContext): void | Promise<void>;
}
