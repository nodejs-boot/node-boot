/**
 * Decorator to enable API request validation in a Node-Boot application.
 * This decorator registers `ValidationsConfiguration` automatically when applied to the application class.
 *
 * @returns {ClassDecorator} - A decorator to enable request validations.
 */
import {ValidationsConfiguration} from "../config";

export const EnableValidations = (): ClassDecorator => {
    return () => {
        new ValidationsConfiguration();
    };
};
