import { Configuration } from "@node-boot/core";
import hpp from "hpp";
import helmet from "helmet";
import { Bean, BeansContext } from "@node-boot/context";
import { Application } from "express";

@Configuration()
export class SecurityConfiguration {
  @Bean()
  public security({ application, iocContainer }: BeansContext<Application>) {
    application.use(hpp());
    application.use(helmet());
    application.disable("x-powered-by");
  }
}
