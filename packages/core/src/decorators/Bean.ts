export const BEAN_METADATA_KEY = Symbol("Bean");
export const BEAN_NAME_METADATA_KEY = Symbol("Bean-Name");

export function Bean(beanName?: string): Function {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(BEAN_METADATA_KEY, true, target, propertyKey);
    if (beanName) {
      Reflect.defineMetadata(
        BEAN_NAME_METADATA_KEY,
        beanName,
        target,
        propertyKey
      );
    }
  };
}
