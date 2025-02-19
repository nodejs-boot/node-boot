import {ApplicationOptions, Config, JsonObject, LoggerService} from "@nodeboot/context";
import {BaseServer} from "./BaseServer";

export type NodeBootAppView = {
    appOptions: ApplicationOptions;
    logger: LoggerService;
    config: Config;
    server: BaseServer;
};

export interface NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView>;
}
