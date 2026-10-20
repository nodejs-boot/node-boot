import {Bean, Configuration} from "@nodeboot/core";

@Configuration()
export class DefaultDiAppConfiguration {
    @Bean("default-di-app-name")
    public appName(): string {
        return "ghost-server-default-di-test";
    }
}
