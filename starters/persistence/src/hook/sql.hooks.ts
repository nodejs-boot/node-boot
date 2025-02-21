import {EntityManager, QueryRunner, Repository} from "typeorm";

/**
 * Retrieves the EntityManager associated with a given TypeORM repository instance.
 *
 * @template R - A repository extending Repository or any other TypeORM repository.
 * @param repoInstance - An instance of a TypeORM Repository.
 * @returns The EntityManager associated with the repository.
 * @throws Error if the repository instance is invalid.
 */
export function useEntityManager<R extends Repository<any>>(repoInstance: R): EntityManager {
    if (!repoInstance.manager) {
        throw new Error(`useEntityManager hook can only be used inside a valid TypeORM repository`);
    }
    return repoInstance.manager;
}

/**
 * Retrieves the QueryRunner associated with a given TypeORM repository.
 *
 * @template R - A repository extending TypeORM's Repository.
 * @param repoInstance - An instance of a TypeORM Repository.
 * @returns The QueryRunner associated with the repository.
 * @throws Error if the repository does not have a valid QueryRunner.
 */
export function useQueryRunner<R extends Repository<any>>(repoInstance: R): QueryRunner {
    if (!repoInstance.queryRunner) {
        throw new Error(`useQueryRunner hook can only be used inside repositories with an active QueryRunner`);
    }
    return repoInstance.queryRunner;
}
