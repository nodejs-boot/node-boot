import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {HonoServerConfigProperties, HonoServerConfigs} from "@nodeboot/hono-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext): HonoServerConfigs {
        logger.debug(`Resolving hono server configuration`);

        // The preferred way to get the configs if by using the configurations files.
        // But you can set up hardcoded server configs if you want
        const serverConfigs = config.getOptional<HonoServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

        return {
            cors: {
                options: serverConfigs?.cors,
            },
            multipart: {
                options: serverConfigs?.multipart,
            },
        };
    }
}
