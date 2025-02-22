import {ApplicationContext} from "@nodeboot/context";
import {SCHEDULING_FEATURE} from "../types";

export const EnableScheduling = (): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE] = true;
    };
};
