import {ConfigurationProperties} from "@nodeboot/config";

@ConfigurationProperties({
    configPath: "app",
    configName: "app-config",
})
export class AppConfigProperties {
    name: string;
    platform: string;
    environment: string;
    defaultErrorHandler: boolean;
    customErrorHandler?: boolean;
    port: number;
}
