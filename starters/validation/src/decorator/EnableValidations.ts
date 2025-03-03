import {ValidationsConfiguration} from "../config";

export const EnableValidations = (): ClassDecorator => {
    return () => {
        new ValidationsConfiguration();
    };
};
