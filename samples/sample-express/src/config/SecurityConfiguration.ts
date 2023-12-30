import {Bean, Configuration} from "@node-boot/core";
import hpp from "hpp";
import helmet from "helmet";
import {BeansContext} from "@node-boot/context";
import {Application} from "express";

@Configuration()
export class SecurityConfiguration {
    @Bean()
    public security({application}: BeansContext<Application>) {
        application.use(hpp());
        application.use(helmet());
        application.disable("x-powered-by");
    }
}
