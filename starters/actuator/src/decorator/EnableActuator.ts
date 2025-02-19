import {ApplicationContext} from "@nodeboot/context";
import {DefaultActuatorAdapter} from "../adapter";

export function EnableActuator(): Function {
    return function () {
        ApplicationContext.get().actuatorAdapter = new DefaultActuatorAdapter();
    };
}
