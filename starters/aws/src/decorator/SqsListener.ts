import {ApplicationContext} from "@nodeboot/context";
import {SqsListenerAdapter} from "../adapter";

export function SqsListener(queueUrlOrConfigPlaceholder: string): MethodDecorator {
    return function (target: any, _: string | symbol, descriptor: PropertyDescriptor) {
        const sqsListenerAdapter = new SqsListenerAdapter({
            target,
            queueUrlOrConfigPlaceholder,
            listenerFunction: descriptor.value,
        });
        ApplicationContext.get().applicationFeatureAdapters.push(sqsListenerAdapter);
    };
}
