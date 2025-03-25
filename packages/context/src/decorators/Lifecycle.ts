import {ApplicationFeatureAdapter} from "../adapters";
import {LifecycleType} from "../types";
import {LIFECYCLE_TYPE_METADATA_KEY} from "../metadata";

export function Lifecycle<THandler extends new (...args: any[]) => ApplicationFeatureAdapter>(type: LifecycleType) {
    return (target: THandler) => {
        Reflect.defineMetadata(LIFECYCLE_TYPE_METADATA_KEY, type, target);
    };
}
