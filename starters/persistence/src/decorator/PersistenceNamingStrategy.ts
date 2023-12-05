import {NamingStrategyInterface} from "typeorm/naming-strategy/NamingStrategyInterface";
import {PersistenceContext} from "../PersistenceContext";

export function PersistenceNamingStrategy<
    T extends new (...args: any[]) => NamingStrategyInterface,
>() {
    return (target: T) => {
        PersistenceContext.get().namingStrategy = target;
    };
}
