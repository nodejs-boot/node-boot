import {Bean, Configuration, SERVER_CONFIGURATIONS} from "@nodeboot/core";
import {KoaServerConfigs} from "../../src";

@Configuration()
export class ServerConfiguration {
    @Bean(SERVER_CONFIGURATIONS)
    public serverConfig(): KoaServerConfigs {
        return {
            cookie: {enabled: true},
        };
    }
}
