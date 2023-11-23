import type { RoutingControllersOptions } from "routing-controllers/types/RoutingControllersOptions";
import type { NodeBootAdapter } from "./NodeBootAdapter";
import { IocContainer } from "../ioc";

export interface ApplicationAdapter extends NodeBootAdapter {
  bind(iocContainer?: IocContainer): RoutingControllersOptions;
}
