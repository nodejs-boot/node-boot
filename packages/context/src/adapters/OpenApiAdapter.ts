import type {NodeBootAdapter} from "./NodeBootAdapter";

export interface OpenApiAdapter extends NodeBootAdapter {

    bind(controllers: Function[]): void
}
