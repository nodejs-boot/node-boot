import type { RoutingControllersOptions } from "routing-controllers/types/RoutingControllersOptions";
import type { NodeBootAdapter } from "./NodeBootAdapter";

export interface ApplicationAdapter extends NodeBootAdapter {
  bind(): RoutingControllersOptions;
}
