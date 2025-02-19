import {Bean, Configuration} from "@nodeboot/core";
import hpp from "hpp";
import helmet from "helmet";
import {BeansContext} from "@nodeboot/context";
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
