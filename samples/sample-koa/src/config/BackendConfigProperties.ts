import {ConfigurationProperties} from "@node-boot/config";

@ConfigurationProperties({
    configPath: "backend",
    configName: "backend-config",
})
export class BackendConfigProperties {
    baseUrl: string;
    allowInsecureCookie: boolean;
}
