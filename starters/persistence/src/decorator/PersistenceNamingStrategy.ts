import {NamingStrategyInterface} from "typeorm/naming-strategy/NamingStrategyInterface";
import {PersistenceContext} from "../PersistenceContext";

/**
 * Decorator to register a custom naming strategy for the persistence layer.
 *
 * This decorator sets the given class as the active naming strategy to be used by TypeORM
 * when generating database table and column names.
 *
 * @template T - A class implementing TypeORM's NamingStrategyInterface.
 * @returns {ClassDecorator} The class decorator function.
 *
 * @example
 * ```ts
 * import {PersistenceNamingStrategy} from "@nodeboot/starter-persistence";
 * import {DefaultNamingStrategy, NamingStrategyInterface} from "typeorm";
 *
 * @PersistenceNamingStrategy()
 * class CustomNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
 *   tableName(className: string, customName: string): string {
 *     return customName ? customName.toLowerCase() : className.toLowerCase();
 *   }
 * }
 * ```
 *
 * @author
 * Manuel Santos <https://github.com/manusant>
 */
export function PersistenceNamingStrategy<T extends new (...args: any[]) => NamingStrategyInterface>() {
    return (target: T) => {
        PersistenceContext.get().namingStrategy = target;
    };
}
