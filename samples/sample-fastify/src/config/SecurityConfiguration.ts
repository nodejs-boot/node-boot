import {Bean, Configuration} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {FastifyInstance} from "fastify";
import helmet from "@fastify/helmet";

@Configuration()
export class SecurityConfiguration {
    @Bean()
    public security({application}: BeansContext<FastifyInstance>) {
        application.register(helmet);
    }
}
