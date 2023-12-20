import {ConfigurationProperties} from "@node-boot/config";

@ConfigurationProperties({
    configPath: "node-boot.app",
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
