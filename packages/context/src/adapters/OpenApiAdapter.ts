import type {NodeBootAdapter} from "./NodeBootAdapter";

export type OpenApiOptions = {
    basePath?: string;
    controllers: Function[];
};

export interface OpenApiAdapter extends NodeBootAdapter {
    bind(options: OpenApiOptions, server: any, router: any): void;
}
