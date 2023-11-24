import {BEAN_METADATA_KEY, BEAN_NAME_METADATA_KEY} from "@node-boot/context";

export function Bean(beanName?: string): Function {
    return function (target: any, propertyKey: string) {
        Reflect.defineMetadata(BEAN_METADATA_KEY, true, target, propertyKey);
        if (beanName) {
            Reflect.defineMetadata(
                BEAN_NAME_METADATA_KEY,
                beanName,
                target,
                propertyKey,
            );
        }
    };
}
