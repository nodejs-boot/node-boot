import type {NodeBootAdapter} from "./NodeBootAdapter";
import {OpenApiAdapter} from "./OpenApiAdapter";

export interface SwaggerUiAdapter extends NodeBootAdapter {
    bind(serverType: string): OpenApiAdapter;
}
