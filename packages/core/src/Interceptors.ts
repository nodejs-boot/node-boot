import {ApplicationContext} from "../ApplicationContext";

export function Interceptors(interceptors: Function[]): Function {
  return function (target: any) {
    ApplicationContext.get().interceptorClasses = interceptors;
  };
}
