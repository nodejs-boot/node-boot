import {ApplicationContext} from "@nodeboot/context";
import {HTTP_CLIENT_FEATURE} from "../client";

export const EnableHttpClients = (): ClassDecorator => {
    return () => {
        ApplicationContext.get().applicationFeatures[HTTP_CLIENT_FEATURE] = true;
    };
};
