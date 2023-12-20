import type {NodeBootAdapter} from "./NodeBootAdapter";
import {IocContainer} from "../ioc";
import {NodeBootEngineOptions} from "../options";

export interface ApplicationAdapter extends NodeBootAdapter {
    bind(iocContainer?: IocContainer): NodeBootEngineOptions;
}
