import { Interceptor as InnerInterceptor } from "routing-controllers";
import { decorateDi } from "@node-boot/di";

/**
 * Registers a global interceptor..
 *
 * @param args Arguments for routing-controllers @Interceptor decorator:
 *  <br/>- <b>priority</b> Middleware priority in the chain
 */
export function Interceptor(...args: Parameters<typeof InnerInterceptor>) {
  return <TFunction extends Function>(target: TFunction) => {
    // DI is optional and the decorator will only be applied if the DI container dependency is available.
    decorateDi(target);
    InnerInterceptor(...args)(target);
  };
}
