import type {NodeBootAdapter} from "./NodeBootAdapter";
import {IocContainer} from "../ioc";

export interface RepositoriesAdapter extends NodeBootAdapter {
    bind(iocContainer: IocContainer): void;
}
