import {ApplicationOptions, Config, LoggerService} from "@node-boot/context";

export type NodeBootAppView = {
    appOptions: ApplicationOptions;
    logger: LoggerService;
    config: Config;
    framework: any;
    router: any;
};

export interface NodeBootApp {
    start(port?: number): Promise<NodeBootAppView>;
}
