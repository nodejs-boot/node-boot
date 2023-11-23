import type {NodeBootAdapter} from "./NodeBootAdapter";
import type {IocContainer} from "../ioc";

export interface ConfigurationPropertiesAdapter extends NodeBootAdapter {

    bind(iocContainer: IocContainer): void
}
