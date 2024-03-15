import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@node-boot/core";
import {BeansContext} from "@node-boot/context";
import {KoaServerConfigProperties, KoaServerConfigs} from "@node-boot/koa-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext): KoaServerConfigs {
        logger.debug(`Resolving express server configuration`);

        // The preferred way to get the configs if by using the configurations files.
        // But you can set up hardcoded server configs if you want
        const serverConfigs = config.getOptional<KoaServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cookie: {
                options: serverConfigs?.cookie,
            },
            cors: {
                options: serverConfigs?.cors,
            },
            session: {
                options: serverConfigs?.session,
            },
            multipart: {
                options: serverConfigs?.multipart,
            },
            template: {
                options: serverConfigs?.template,
            },
        };
    }
}
