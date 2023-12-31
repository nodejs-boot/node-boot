import {RepositoryType} from "../types";

/**
 * Arguments for EntityRepositoryMetadata class, helps to construct an EntityRepositoryMetadata object.
 */
export interface RepositoryMetadata {
    /**
     * Constructor of the entity repository.
     */
    readonly target: Function;

    /**
     * Entity managed by the repository.
     */
    readonly entity: Function;

    /**
     * Type of repository
     */
    readonly type: RepositoryType;
}
