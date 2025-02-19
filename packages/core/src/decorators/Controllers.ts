import {ApplicationContext} from "@nodeboot/context";

export function Controllers(controllers: Function[]): Function {
    return function () {
        ApplicationContext.get().controllerClasses = controllers;
    };
}
