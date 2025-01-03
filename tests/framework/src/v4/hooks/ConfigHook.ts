import {Hook} from "./Hook";
import {JsonObject} from "@node-boot/context";

export class ConfigHook extends Hook {
    private configs: JsonObject[] = [];

    override beforeStart() {
        const mergedConfig = Object.assign({}, ...this.configs);
        this.setState("config", mergedConfig);
    }

    call(config: JsonObject) {
        this.configs.push(config);
    }
}
