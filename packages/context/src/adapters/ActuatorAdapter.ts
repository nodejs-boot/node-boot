import type {NodeBootAdapter} from "./NodeBootAdapter";

export type ActuatorOptions = {
    appName: string;
    serverType: string;
};

export interface ActuatorAdapter extends NodeBootAdapter {
    bind(options: ActuatorOptions, server: any, router: any): void;
}
