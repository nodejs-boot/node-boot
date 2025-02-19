import {ApplicationContext} from "@nodeboot/context";

export function Interceptors(interceptors: Function[]): Function {
    return function () {
        ApplicationContext.get().interceptorClasses = interceptors;
    };
}
