import {PersistenceContext} from "../PersistenceContext";
import {QueryResultCache} from "typeorm/cache/QueryResultCache";
import {decorateDi} from "@node-boot/di";

export function PersistenceCache<
    T extends new (...args: any[]) => QueryResultCache,
>() {
    return (target: T) => {
        // Inject dependencies if DI container is configured
        decorateDi(target);
        PersistenceContext.get().queryCache = target;
    };
}
