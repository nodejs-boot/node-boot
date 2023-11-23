import { IocContainer } from "./ioc";

export type BeansContext<TApplication> = {
  iocContainer: IocContainer;
  application: TApplication;
};
