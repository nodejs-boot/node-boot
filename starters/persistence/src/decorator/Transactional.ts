import {Transactional as InnerTransactional, WrapInTransactionOptions} from "typeorm-transactional";

/**
 * Decorator to mark a method as transactional.
 *
 * When applied, the method is automatically executed within a transactional context.
 * This is useful for ensuring atomic operations across database queries.
 *
 * This decorator leverages `typeorm-transactional` to manage the transactional scope and propagation.
 *
 * @param options - (Optional) Configuration for transaction behavior.
 *  - `connectionName`?: string — Name of the connection to use.
 *  - `propagation`?: Propagation — Defines how transactions relate to each other (e.g., REQUIRED, REQUIRES_NEW).
 *  - `isolationLevel`?: IsolationLevel — The isolation level for the transaction.
 *  - `name`?: string | symbol — Optional name for the transaction context.
 *
 * @returns MethodDecorator — A method decorator that wraps the function in a transaction.
 *
 * @example
 * ```ts
 * import {Transactional} from "@nodeboot/starter-persistence";
 *
 * class UserService {
 *   @Transactional()
 *   async createUser(name: string): Promise<User> {
 *     // All operations here are part of the same transaction
 *     const user = new User();
 *     user.name = name;
 *     return await this.userRepository.save(user);
 *   }
 * }
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export const Transactional = (options?: WrapInTransactionOptions): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        InnerTransactional(options)(target, propertyKey, descriptor);
    };
};
