import {PersistenceContext} from "../PersistenceContext";
import {RepositoryType} from "../types";

/**
 * Helper function to determine the repository type based on prototype chain.
 * It checks if the prototype is an instance of Repository, MongoRepository, or TreeRepository.
 *
 * @param {any} prototype - The prototype object of the repository class.
 * @returns {RepositoryType | undefined} The repository type if found, otherwise undefined.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
function getRepositoryType(prototype: any): RepositoryType | undefined {
    while (prototype) {
        if (prototype.constructor.name === "Repository") {
            return RepositoryType.SQL;
        }
        if (prototype.constructor.name === "MongoRepository") {
            return RepositoryType.MONGO;
        }
        if (prototype.constructor.name === "TreeRepository") {
            return RepositoryType.TREE;
        }
        prototype = Object.getPrototypeOf(prototype);
    }
    return undefined;
}

/**
 * Class decorator for marking a class as a data repository.
 *
 * Registers the repository with the PersistenceContext and associates it with an entity.
 * Validates that the repository extends one of TypeORM's Repository classes (Repository, MongoRepository, TreeRepository).
 *
 * @param {Function} entity - The entity class associated with the repository.
 * @returns {ClassDecorator} The class decorator function.
 *
 * @throws {Error} If the target class does not extend a supported repository class.
 *
 * @example
 * ```ts
 * @DataRepository(User)
 * export class UserRepository extends Repository<User> { }
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export const DataRepository = (entity: Function): ClassDecorator => {
    return (target: Function) => {
        const repoType = getRepositoryType(target.prototype);
        if (!repoType) {
            throw new Error(
                `Invalid repository type for repository ${target.prototype.name}. Please extend from Repository, MongoRepository or TreeRepository`,
            );
        }

        Reflect.defineMetadata("custom:repotype", repoType, target.prototype);
        Reflect.defineMetadata("__isRepository", true, target);

        PersistenceContext.get().repositories.push({
            target,
            entity,
            type: repoType,
        });
    };
};
