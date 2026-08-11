import {resolve as resolvePath} from "path";
import parseArgs from "minimist";
import {findPaths} from "@backstage/cli-common";
import {ConfigTarget, loadConfig, LoadConfigOptionsRemote} from "@backstage/config-loader";
import {AppConfig, ConfigReader} from "@backstage/config";
import {ConfigService} from "./ConfigService";
import {JsonObject} from "@nodeboot/context";

export function isValidUrl(url: string): boolean {
    try {
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

    const config = new ConfigService();

    const additionalConfigs: AppConfig[] = [];

    if (options.additionalConfigData) {
        additionalConfigs.push({context: "runtime-configs", data: options.additionalConfigData});
    }

    let appConfigs: AppConfig[] = [];

    try {
        const paths = findPaths(__dirname);

        let currentCancelFunc: (() => void) | undefined = undefined;

        ({appConfigs} = await loadConfig({
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
        }));

        console.info(`Loaded config from ${appConfigs.map(c => c.context).join(", ")}`);
    } catch (error) {
        // File-system based config discovery/loading isn't available in every runtime
        // (e.g. Cloudflare Workers and other edge/sandboxed environments have no real
        // filesystem, no `__dirname`/`package.json` to walk up to). In those cases, fall
        // back to whatever configuration was supplied at runtime via `additionalConfigData`
        // instead of failing the whole application startup.
        console.warn(
            `Skipping filesystem-based config discovery (no app-config.yaml found or unsupported runtime): ${
                (error as Error).message
            }`,
        );
    }

    const finalAppConfigs = [...appConfigs];
    finalAppConfigs.push(...additionalConfigs);
    config.setConfig(ConfigReader.fromConfigs(finalAppConfigs));

    return {config};
}
