import { IocContainer } from "./ioc";
import { Action } from "routing-controllers";

export type BeansContext<TApplication> = {
  iocContainer: IocContainer;
  application: TApplication;
};

/**
 * Controller action properties.
 */
export type RequestContext = Action;
