import {ApplicationContext} from "@nodeboot/context";
import {PostConstructAdaptor} from "../adapters";

/**
 * Marks a method to be executed after the instance has been constructed
 * and dependencies have been injected.
 * This decorator registers the method with the PostConstructAdaptor,
 * which will invoke it at the appropriate lifecycle phase.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
export function PostConstruct(): MethodDecorator {
    return function (target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const postConstructAdaptor = new PostConstructAdaptor({
            target,
            postConstructFunction: descriptor.value,
        });
        ApplicationContext.get().applicationFeatureAdapters.push(postConstructAdaptor);
    };
}
