import {Bean, Configuration} from "@nodeboot/core";
import {ApplicationContext, BeansContext} from "@nodeboot/context";
import {ValidatorOptions} from "class-validator";

/**
 * This starter package provides an auto-configuration mechanism for API request validation using `class-validator`.
 * The configuration options are loaded from the application configuration file (`app-config.yaml`)
 * under the `api.validations` section. If no configuration is found, default settings are applied.
 */
@Configuration()
export class ValidationsConfiguration {
    /**
     * Configures API request validations based on `class-validator` options.
     *
     * These options are configurable in the `app-config.yaml` file under `api.validations` config path.
     *
     * @typedef {Object} ValidatorOptions
     * @description
     * Options passed to `class-validator` to configure validation behavior.
     * @property {boolean} [enableDebugMessages] - Enables debug messages.
     * @property {boolean} [skipUndefinedProperties] - Skips validation for undefined properties.
     * @property {boolean} [skipNullProperties] - Skips validation for null properties.
     * @property {boolean} [skipMissingProperties] - Skips validation for missing properties.
     * @property {boolean} [whitelist] - Removes non-decorated properties.
     * @property {boolean} [forbidNonWhitelisted] - Throws an error if non-whitelisted properties exist.
     * @property {string[]} [groups] - Specifies validation groups.
     * @property {boolean} [always] - Applies validation to all properties by default.
     * @property {boolean} [strictGroups] - Ignores decorators with at least one group if `groups` is empty.
     * @property {boolean} [dismissDefaultMessages] - Disables default error messages.
     * @property {Object} [validationError] - Configures error responses.
     * @property {boolean} [validationError.target] - Includes the target object in validation errors.
     * @property {boolean} [validationError.value] - Includes validated values in errors.
     * @property {boolean} [forbidUnknownValues] - Fails validation for unknown objects.
     * @property {boolean} [stopAtFirstError] - Stops validation after the first error.
     * @param {BeansContext} context - The application context providing logger and configuration.
     */
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
