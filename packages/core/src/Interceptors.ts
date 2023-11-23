import { ApplicationContext } from "@node-boot/context";

export function Interceptors(interceptors: Function[]): Function {
  return function (target: any) {
    ApplicationContext.get().interceptorClasses = interceptors;
  };
}
