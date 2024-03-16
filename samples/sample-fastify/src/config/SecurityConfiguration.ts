import {Bean, Configuration} from "@node-boot/core";
import {BeansContext} from "@node-boot/context";
import {FastifyInstance} from "fastify";
import helmet from "@fastify/helmet";

@Configuration()
export class SecurityConfiguration {
    @Bean()
    public security({application}: BeansContext<FastifyInstance>) {
        application.register(helmet);
    }
}
