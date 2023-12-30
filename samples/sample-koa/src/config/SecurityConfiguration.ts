import {Bean, Configuration} from "@node-boot/core";
import helmet from "koa-helmet";
import {BeansContext} from "@node-boot/context";
import Koa from "koa";
import cors from "@koa/cors";

@Configuration()
export class SecurityConfiguration {
    @Bean()
    public security({application}: BeansContext<Koa>) {
        application.use(
            helmet({
                // FIXME - Disabling contentSecurityPolicy if @EnableOpenApi is applied
                contentSecurityPolicy: false,
            }),
        );
        application.use(cors());
    }
}
