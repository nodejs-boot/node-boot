import {ApplicationContext} from "@nodeboot/context";
import {SCHEDULING_FEATURE} from "../types";

export const EnableScheduling = (): ClassDecorator => {
    return (target: any) => {
        Reflect.defineMetadata("custom:scannable", "EnableScheduling", target);
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;
    };
};
