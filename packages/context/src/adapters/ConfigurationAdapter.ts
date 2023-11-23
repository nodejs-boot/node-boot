import type { NodeBootAdapter } from "./NodeBootAdapter";
import { BeansContext } from "../types";

export interface ConfigurationAdapter extends NodeBootAdapter {
  bind<TApplication>(context: BeansContext<TApplication>): Promise<void>;
}
