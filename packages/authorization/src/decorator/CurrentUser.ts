import { CurrentUser as InnerCurrentUser } from "routing-controllers";

/**
 * Injects currently authorized user.
 * Authorization logic must be defined in routing-controllers settings.
 *
 * @param args Arguments for routing-controllers @CurrentUser decorator
 */
export function CurrentUser(...args: Parameters<typeof InnerCurrentUser>) {
  return <TFunction extends Function>(
    target: TFunction,
    methodName: string,
    index: number
  ) => {
    InnerCurrentUser(...args)(target, methodName, index);
  };
}
