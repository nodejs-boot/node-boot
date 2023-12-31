import {ApplicationContext} from "@node-boot/context";

export function Interceptors(interceptors: Function[]): Function {
    return function () {
        ApplicationContext.get().interceptorClasses = interceptors;
    };
}
