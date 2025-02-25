import type {NodeBootAdapter} from "./NodeBootAdapter";
import {IocContainer} from "../ioc";
import {LoggerService} from "../services";

export type OpenApiOptions = {
    basePath?: string;
    controllers: Function[];
    iocContainer: IocContainer;
    logger: LoggerService;
};

export interface OpenApiAdapter extends NodeBootAdapter {
    bind(options: OpenApiOptions, server: any, router: any): Promise<void>;
}
