import {EntitySubscriberInterface, EventSubscriber} from "typeorm";
import {PersistenceContext} from "../PersistenceContext";

export function EntityEventSubscriber<T extends new (...args: any[]) => EntitySubscriberInterface>() {
    return (target: T) => {
        EventSubscriber()(target);
        PersistenceContext.get().eventSubscribers.push(target);
    };
}
