import {ConfigReader} from "@backstage/config";
import {JsonObject} from "@node-boot/context";
import {ConfigService} from "./service";

export function loadConfig(appConfigData: JsonObject): ConfigService {
    const config = new ConfigService();
    config.setConfig(ConfigReader.fromConfigs([{context: "app-config", data: appConfigData}]));
    return config;
}
