import {Hook} from "./Hook";
import {ApplicationContext, Config, JsonObject} from "@nodeboot/context";
import {ConfigService} from "@nodeboot/config";

export class ConfigHook extends Hook {
    private configs: JsonObject[] = [];

    override beforeStart() {
        const mergedConfig = Object.assign({}, ...this.configs);
        this.setState("config", mergedConfig);
    }

    call(config: JsonObject) {
        this.configs.push(config);
    }

    use(): Config {
        const iocContainer = ApplicationContext.getIocContainer();
        if (iocContainer?.has(ConfigService)) {
            return iocContainer.get(ConfigService);
        }
        throw new Error(
            `No Config found in the IOC container. Please bootstrap your NodeBoot server before calling useConfig hook`,
        );
    }
}
