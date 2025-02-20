import {Bean, Configuration, SERVER_CONFIGURATIONS, SERVER_CONFIGURATIONS_PROPERTY_PATH} from "@nodeboot/core";
import {BeansContext} from "@nodeboot/context";
import {ExpressServerConfigProperties, ExpressServerConfigs} from "@nodeboot/express-server";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig({config, logger}: BeansContext): ExpressServerConfigs {
        logger.debug(`Resolving express server configuration`);

        // The preferred way to get the configs if by using the configurations files.
        // But you can set up hardcoded server configs if you want
        const serverConfigs = config.getOptional<ExpressServerConfigProperties>(SERVER_CONFIGURATIONS_PROPERTY_PATH);

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
            template: {},
        };
    }
}
