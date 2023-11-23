import {UseContainerOptions} from "routing-controllers/types/container";
import {IocContainer} from "../ioc";

export type DependencyInjectionOptions = {
  iocContainer: IocContainer;
  options?: UseContainerOptions;
}
