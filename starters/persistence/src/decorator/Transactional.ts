import {Transactional as InnerTransactional, WrapInTransactionOptions} from "typeorm-transactional";

/**
 * The Transactional function is a decorator that can be applied to methods in TypeScript classes. It wraps the decorated
 * method in a transaction, providing transactional behavior for the method's execution.
 *
 * The decorated method is wrapped in a transaction, allowing it to be executed within a transactional context.
 *
 * @example
 * ```ts
 * class UserService {
 *   @Transactional()
 *   async createUser(name: string): Promise<User> {
 *     // Method implementation
 *   }
 * }
 * ```
 *
 * @param options (optional) - An object that can contain the following properties:
 *      connectionName: The name of the data source connection to use for the transaction.
 *      propagation: The propagation behavior of the transaction.
 *      isolationLevel: The isolation level of the transaction.
 *      name: The name or symbol of the method being decorated.
 * */
export const Transactional = (options?: WrapInTransactionOptions): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        InnerTransactional(options)(target, propertyKey, descriptor);
    };
};
