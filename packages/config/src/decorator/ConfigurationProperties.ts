import {ApplicationContext, ConfigurationPropertiesAdapter, IocContainer} from "@node-boot/context";
import {ConfigurationPropertiesMetadata} from "../metadata";
import {ConfigService} from "../service";

export function ConfigurationProperties(args: ConfigurationPropertiesMetadata): Function {
    return function (target: any) {
        Reflect.defineMetadata("config:isConfigProperties", true, target);
        Reflect.defineMetadata("config:path", args.configPath, target);

        ApplicationContext.get().configurationPropertiesAdapters.push(
            new (class implements ConfigurationPropertiesAdapter {
                bind(iocContainer: IocContainer) {
                    const config: ConfigService = iocContainer.get("config");
                    const configProperties = config.get<typeof target>(args.configPath);

                    if (configProperties) {
                        const instance = new target();

                        for (const propertyName in configProperties) {
                            if (Object.prototype.hasOwnProperty.call(configProperties, propertyName)) {
                                instance[propertyName] = configProperties[propertyName];
                            }
                        }
                        if (!iocContainer.has(args.configName)) {
                            iocContainer.set(args.configName, instance);
                        } else {
                            throw new Error(
                                `There is already a bean registered with name ${args.configName}. Please check your @ConfigurationProperties classes for duplicated config names.`,
                            );
                        }
                    } else {
                        throw new Error(`Configuration for prefix '${args.configPath}' not found.`);
                    }
                }
            })(),
        );
    };
}
