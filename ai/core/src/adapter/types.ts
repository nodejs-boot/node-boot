import {ToolDecoratorOptions} from "../types";

export interface ToolAdapterOptions {
    target: any;
    methodName: string;
    methodFunction: Function;
    toolOptions: ToolDecoratorOptions;
}
