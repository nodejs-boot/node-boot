import {ApplicationContext} from "@nodeboot/context";
import {SqsListenerAdapter} from "../adapter";
import type {SqsListenerOptions} from "../adapter";

/**
 * Consumes an SQS queue with the decorated method. `queueUrlOrConfigPlaceholder` is a queue URL or a `${config.path}`
 * placeholder resolving to one. The method receives a {@link MessageEnvelop}; throwing leaves the message on the queue.
 */
export function SqsListener(queueUrlOrConfigPlaceholder: string, options: SqsListenerOptions = {}): MethodDecorator {
    return function (target: any, _: string | symbol, descriptor: PropertyDescriptor) {
        const sqsListenerAdapter = new SqsListenerAdapter({
            target,
            queueUrlOrConfigPlaceholder,
            listenerFunction: descriptor.value,
            consumerOptions: options,
        });
        ApplicationContext.get().applicationFeatureAdapters.push(sqsListenerAdapter);
    };
}
