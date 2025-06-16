import {RepositoryType} from "../types";

/**
 * Arguments for the `RepositoryMetadata` object, which helps define metadata
 * for a custom entity repository within the persistence layer.
 *
 * This interface is used internally to register repositories decorated with `@DataRepository`,
 * associating them with their managed entity and repository type (SQL, Mongo, Tree, etc).
 *
 * @example
 * ```ts
 * const metadata: RepositoryMetadata = {
 *   target: UserRepository,
 *   entity: User,
 *   type: RepositoryType.SQL,
 * };
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export interface RepositoryMetadata {
    /**
     * Constructor of the repository class.
     */
    readonly target: Function;

    /**
     * The entity class that the repository manages.
     */
    readonly entity: Function;

    /**
     * The type of repository (SQL, MONGO, TREE).
     */
    readonly type: RepositoryType;
}
