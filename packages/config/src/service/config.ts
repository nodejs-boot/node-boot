import {resolve as resolvePath} from "path";
import parseArgs from "minimist";
import {findPaths} from "@backstage/cli-common";
import {ConfigTarget, loadConfig, LoadConfigOptionsRemote} from "@backstage/config-loader";
import {AppConfig, ConfigReader} from "@backstage/config";
import {ConfigService} from "./ConfigService";
import {JsonObject} from "@nodeboot/context";

export function isValidUrl(url: string): boolean {
    try {
        // eslint-disable-next-line no-new
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Load configuration for a Backend.
 *
 * This function should only be called once, during the initialization of the backend.
 *
 * @public
 */
export async function loadNodeBootConfig(options: {
    remote?: LoadConfigOptionsRemote;
    argv: string[];
    additionalConfigData?: JsonObject;
}): Promise<{config: ConfigService}> {
    const args = parseArgs(options.argv);

    const configTargets: ConfigTarget[] = [args["config"] ?? []]
        .flat()
        .map(arg => (isValidUrl(arg) ? {url: arg} : {path: resolvePath(arg)}));

    /* eslint-disable-next-line no-restricted-syntax */
    const paths = findPaths(__dirname);

    let currentCancelFunc: (() => void) | undefined = undefined;

    const config = new ConfigService();

    const additionalConfigs: AppConfig[] = [];

    if (options.additionalConfigData) {
        additionalConfigs.push({context: "runtime-configs", data: options.additionalConfigData});
    }

    const {appConfigs} = await loadConfig({
        configRoot: paths.targetRoot,
        configTargets: configTargets,
        remote: options.remote,
        watch: {
            onChange(newConfigs) {
                console.info(`Reloaded config from ${newConfigs.map(c => c.context).join(", ")}`);
                const configsToMerge = [...newConfigs];
                configsToMerge.push(...additionalConfigs);
                config.setConfig(ConfigReader.fromConfigs(configsToMerge));
            },
            stopSignal: new Promise(resolve => {
                if (currentCancelFunc) {
                    currentCancelFunc();
                }
                currentCancelFunc = resolve;
            }),
        },
    });

    console.info(`Loaded config from ${appConfigs.map(c => c.context).join(", ")}`);

    const finalAppConfigs = [...appConfigs];
    finalAppConfigs.push(...additionalConfigs);
    config.setConfig(ConfigReader.fromConfigs(finalAppConfigs));

    return {config};
}
