import {EntitySubscriberInterface, EventSubscriber} from "typeorm";
import {PersistenceContext} from "../PersistenceContext";

/**
 * Decorator to mark a class as a TypeORM Entity Subscriber and register it
 * within the PersistenceContext for event handling.
 *
 * Use this decorator on classes implementing EntitySubscriberInterface
 * to automatically subscribe to entity events in the persistence layer.
 *
 * @template T - A class type extending EntitySubscriberInterface.
 * @returns {ClassDecorator} The class decorator function.
 *
 * @example
 * ```ts
 * @EntityEventSubscriber()
 * class UserSubscriber implements EntitySubscriberInterface<User> {
 *    // implementation...
 * }
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function EntityEventSubscriber<T extends new (...args: any[]) => EntitySubscriberInterface>() {
    return (target: T) => {
        EventSubscriber()(target);
        PersistenceContext.get().addEventSubscriber(target);
    };
}
