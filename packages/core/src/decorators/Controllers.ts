import {ApplicationContext} from "@node-boot/context";

export function Controllers(controllers: Function[]): Function {
    return function () {
        ApplicationContext.get().controllerClasses = controllers;
    };
}
