import { ApplicationContext } from "@node-boot/context";

export function Controllers(controllers: Function[]): Function {
  return function (target: any) {
    ApplicationContext.get().controllerClasses = controllers;
  };
}
