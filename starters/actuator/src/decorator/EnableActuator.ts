import {ApplicationContext} from "@node-boot/context";
import {DefaultActuatorAdapter} from "../adapter";

export function EnableActuator(): Function {
    return function () {
        ApplicationContext.get().actuatorAdapter = new DefaultActuatorAdapter();
    };
}
