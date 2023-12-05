import {PersistenceContext} from "../PersistenceContext";
import {MigrationInterface} from "typeorm";

export function Migration<
    T extends new (...args: any[]) => MigrationInterface,
>() {
    return (target: T) => {
        PersistenceContext.get().migrations.push(target);
    };
}
