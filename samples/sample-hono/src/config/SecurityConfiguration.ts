import {Bean, Configuration} from "@nodeboot/core";
import {secureHeaders} from "hono/secure-headers";
import {BeansContext} from "@nodeboot/context";
import {Hono} from "hono";

@Configuration()
export class SecurityConfiguration {
    @Bean()
    public security({application}: BeansContext<Hono>) {
        application.use(secureHeaders());
    }
}
