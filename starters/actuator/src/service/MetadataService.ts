import {getMetadataArgsStorage, MetadataArgsStorage} from "routing-controllers";
import {CONTROLLER_PATH_METADATA_KEY, CONTROLLER_VERSION_METADATA_KEY} from "@node-boot/context";

export class MetadataService {
    constructor(private readonly metadataStorage: MetadataArgsStorage = getMetadataArgsStorage()) {}

    getControllers() {
        return this.metadataStorage.controllers.map(controller => {
            const controllerPath = Reflect.getMetadata(CONTROLLER_PATH_METADATA_KEY, controller.target);
            const controllerVersion = Reflect.getMetadata(CONTROLLER_VERSION_METADATA_KEY, controller.target);
            const actions = this.metadataStorage.actions.filter(
                action => action.target.name === controller.target.name,
            );
            return {
                actions,
                controller: controller.target.name,
                route: controller.route,
                fullRoute: controllerPath,
                type: controller.type,
                options: controller.options,
                version: controllerVersion,
            };
        });
    }

    getMiddlewares() {
        return this.metadataStorage.middlewares;
    }

    getInterceptors() {
        return this.metadataStorage.interceptors.map(interceptor => {
            return {
                target: interceptor.target.name,
            };
        });
    }

    getActuatorEndpoints() {
        return {
            context: "Available actuator endpoints",
            endpoints: [
                "/actuator/info",
                "/actuator/git",
                "/actuator/config",
                "/actuator/memory",
                "/actuator/metrics",
                "/actuator/prometheus",
                "/actuator/controllers",
                "/actuator/interceptors",
                "/actuator/middlewares",
            ],
        };
    }
}
