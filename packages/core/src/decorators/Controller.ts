import { Controller as InnerController } from "routing-controllers";
import { decorateDi } from "@node-boot/di";
import { ENDPOINT_VERSION_METADATA_KEY } from "./ApiVersion";
import { ControllerOptions } from "routing-controllers/types/decorator-options/ControllerOptions";

/**
 * Defines a class as a controller.
 * Each decorated controller method is served as a controller action.
 * Controller actions are executed when request come.
 *
 *  @param baseRoute Extra path you can apply as a base route to all controller actions
 *  @param options Extra options that apply to all controller actions
 */
export function Controller(baseRoute?: string, options?: ControllerOptions) {
  return <TFunction extends Function>(target: TFunction) => {
    const versionMetadata = Reflect.getMetadata(
      ENDPOINT_VERSION_METADATA_KEY,
      target
    );

    if (versionMetadata !== undefined) {
      baseRoute = baseRoute
        ? `/v${versionMetadata}${baseRoute}`
        : `/v${versionMetadata}`;
    }

    // DI is optional and the decorator will only be applied if the DI container dependency is available.
    decorateDi(target);
    InnerController(baseRoute, options)(target);
  };
}
