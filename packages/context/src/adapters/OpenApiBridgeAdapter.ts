import type {NodeBootAdapter} from "./NodeBootAdapter";
import {OpenApiAdapter} from "./OpenApiAdapter";

export interface OpenApiBridgeAdapter extends NodeBootAdapter {
    bind(serverType: string): Promise<OpenApiAdapter>;
}
