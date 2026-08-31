import {Bean, Configuration} from "@nodeboot/core";

@Configuration()
export class AppConfiguration {
    @Bean("app-name")
    public appName(): string {
        return "ghost-server-test";
    }
}
