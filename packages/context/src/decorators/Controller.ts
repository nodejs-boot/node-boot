import { Controller as InnerController } from "routing-controllers";
import { decorateDi } from "../di/makeDiDecoration";

/**
 * Defines a class as a controller.
 * Each decorated controller method is served as a controller action.
 * Controller actions are executed when request come.
 *
 * @param args Arguments for routing-controllers @Controller decorator:
 *  <br/>- <b>baseRoute</b> Extra path you can apply as a base route to all controller actions
 *  <br/>- <b>options</b> Extra options that apply to all controller actions
 */
export function Controller(...args: Parameters<typeof InnerController>) {
  return <TFunction extends Function>(target: TFunction) => {
    // DI is optional and the decorator will only be applied if the DI container dependency is available.
    decorateDi(target);
    InnerController(...args)(target);
  };
}
