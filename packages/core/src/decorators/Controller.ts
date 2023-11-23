import { Controller as InnerController } from "routing-controllers";
import { decorateDi } from "@node-boot/di";
import { ControllerOptions } from "routing-controllers/types/decorator-options/ControllerOptions";
import {
  CONTROLLER_PATH_METADATA_KEY,
  CONTROLLER_VERSION_METADATA_KEY
} from "@node-boot/context";

/**
 * Defines a class as a controller.
 * Each decorated controller method is served as a controller action.
 * Controller actions are executed when request come.
 *
 *  @param baseRoute Extra path you can apply as a base route to all controller actions
 *  @param version controller version to be used as part of the controller route
 *  @param options Extra options that apply to all controller actions
 */
export function Controller(
  baseRoute?: string,
  version?: string,
  options?: ControllerOptions
) {
  return <TFunction extends Function>(target: TFunction) => {
    if (version !== undefined) {
      baseRoute = baseRoute ? `/${version}${baseRoute}` : `/${version}`;
      Reflect.defineMetadata(CONTROLLER_VERSION_METADATA_KEY, version, target);
    }

    Reflect.defineMetadata(CONTROLLER_PATH_METADATA_KEY, baseRoute, target);

    // DI is optional and the decorator will only be applied if the DI container dependency is available.
    decorateDi(target);
    InnerController(baseRoute, options)(target);
  };
}
