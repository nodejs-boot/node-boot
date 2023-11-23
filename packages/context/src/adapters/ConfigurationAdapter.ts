import type {NodeBootAdapter} from "./NodeBootAdapter";
import type {IocContainer} from "../ioc";

export interface ConfigurationAdapter extends NodeBootAdapter {

    bind<TApplication>(application: TApplication, iocContainer: IocContainer): Promise<void>
}
