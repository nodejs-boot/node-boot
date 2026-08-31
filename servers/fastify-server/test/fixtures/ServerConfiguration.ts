import {Bean, Configuration, SERVER_CONFIGURATIONS} from "@nodeboot/core";
import {FastifyServerConfigs} from "../../src";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig(): FastifyServerConfigs {
        return {
            cookie: {enabled: true},
        };
    }
}
