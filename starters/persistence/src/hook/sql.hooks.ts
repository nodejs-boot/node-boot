import {EntityManager, QueryRunner, Repository} from "typeorm";

/**
 * Retrieves the `EntityManager` associated with a given TypeORM repository instance.
 *
 * @template R - A repository extending TypeORM's Repository.
 * @param repoInstance - An instance of a TypeORM Repository.
 * @returns The associated `EntityManager`.
 * @throws Error if the repository instance is invalid or lacks an EntityManager.
 *
 * @example
 * ```ts
 * import { useEntityManager } from "@nodeboot/starter-persistence";
 *
 * const entityManager = useEntityManager(this.userRepository);
 * await entityManager.find(User);
 * ```
 *
 * @author
 * Manuel Santos <https://github.com/manusant>
 */
export function useEntityManager<R extends Repository<any>>(repoInstance: R): EntityManager {
    if (!repoInstance.manager) {
        throw new Error(`useEntityManager hook can only be used inside a valid TypeORM repository`);
    }
    return repoInstance.manager;
}

/**
 * Retrieves the `QueryRunner` associated with a given TypeORM repository instance.
 *
 * @template R - A repository extending TypeORM's Repository.
 * @param repoInstance - An instance of a TypeORM Repository.
 * @returns The associated `QueryRunner`.
 * @throws Error if the repository does not have a valid `QueryRunner`.
 *
 * @example
 * ```ts
 * import { useQueryRunner } from "@nodeboot/starter-persistence";
 *
 * const runner = useQueryRunner(this.userRepository);
 * await runner.connect();
 * ```
 *
 * @author
 * Manuel Santos <https://github.com/manusant>
 */
export function useQueryRunner<R extends Repository<any>>(repoInstance: R): QueryRunner {
    if (!repoInstance.queryRunner) {
        throw new Error(`useQueryRunner hook can only be used inside repositories with an active QueryRunner`);
    }
    return repoInstance.queryRunner;
}
