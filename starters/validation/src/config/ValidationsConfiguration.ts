import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext} from "@nodeboot/context";
import {ValidatorOptions} from "class-validator";

@Configuration()
export class ValidationsConfiguration {
    @Bean()
    public validationConfig({logger, config}: BeansContext) {
        logger.info("Configuring API validations");

        const validationProperties = config.getOptional<ValidatorOptions>("api.validations");

        if (validationProperties) {
            ApplicationContext.get().validation = validationProperties;
            logger.info("API validations successfully configured with configs from app-config.yaml file");
        } else {
            ApplicationContext.get().validation = true;
            logger.info("API validations successfully configured with default configurations");
        }
    }
}
