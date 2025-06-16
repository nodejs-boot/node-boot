import {PersistenceContext} from "../PersistenceContext";
import {MigrationInterface} from "typeorm";

/**
 * Decorator to register a class as a database migration within the persistence context.
 *
 * Use this decorator on classes implementing TypeORM's MigrationInterface to
 * include them in the migration lifecycle of the application.
 *
 * @template T - A class type extending MigrationInterface.
 * @returns {ClassDecorator} The class decorator function.
 *
 * @example
 * ```ts
 * @Migration()
 * class AddUsersTable1616161616161 implements MigrationInterface {
 *   async up(queryRunner: QueryRunner): Promise<void> {
 *     // migration logic here
 *   }
 *   async down(queryRunner: QueryRunner): Promise<void> {
 *     // rollback logic here
 *   }
 * }
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export function Migration<T extends new (...args: any[]) => MigrationInterface>() {
    return (target: T) => {
        PersistenceContext.get().migrations.push(target);
    };
}
