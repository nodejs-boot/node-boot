import {IocContainer, UseContainerOptions} from "../ioc";

export type DependencyInjectionOptions = {
    iocContainer: IocContainer;
    options?: UseContainerOptions;
};
