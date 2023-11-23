import { IocContainer } from "./ioc";
import { Action } from "routing-controllers";
import { Logger } from "winston";
import { Config } from "./config";

export type BeansContext<TApplication = any> = {
  iocContainer: IocContainer;
  application: TApplication;
  logger: Logger;
  config: Config;
};

/**
 * Controller action properties.
 */
export type RequestContext = Action;
