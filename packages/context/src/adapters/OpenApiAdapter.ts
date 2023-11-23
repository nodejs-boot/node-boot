import type { NodeBootAdapter } from "./NodeBootAdapter";

export interface OpenApiAdapter extends NodeBootAdapter {
  bind(router: any, controllers: Function[]): void;
}
