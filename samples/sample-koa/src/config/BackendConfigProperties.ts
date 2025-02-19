import {ConfigurationProperties} from "@nodeboot/config";

@ConfigurationProperties({
    configPath: "backend",
    configName: "backend-config",
})
export class BackendConfigProperties {
    baseUrl!: string;
    allowInsecureCookie!: boolean;
}
