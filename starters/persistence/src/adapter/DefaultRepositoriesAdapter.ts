import {allowedProfiles, IocContainer, RepositoriesAdapter} from "@nodeboot/context";
import {EntityManager} from "typeorm";
import {Logger} from "winston";
import {PersistenceContext} from "../PersistenceContext";

/**
 * Default implementation of the {@link RepositoriesAdapter} interface.
 *
 * Responsible for binding all repositories from the {@link PersistenceContext}
 * to the provided IoC container, initializing them with the TypeORM EntityManager,
 * and caching them inside the EntityManager and the IoC container.
 */
export class DefaultRepositoriesAdapter implements RepositoriesAdapter {
    /**
     * Binds repositories to the given IoC container.
     *
     * Retrieves the TypeORM EntityManager and a Winston Logger instance from the container,
     * then iterates over all repositories defined in the {@link PersistenceContext}.
     * For each repository, it creates an instance, logs the registration,
     * stores the instance in the EntityManager's repository cache, and
     * registers the instance with the IoC container.
     *
     * @param {IocContainer} iocContainer - The IoC container to bind repositories to.
     */
    bind(iocContainer: IocContainer): void {
        const entityManager = iocContainer.get(EntityManager);
        const logger = iocContainer.get(Logger);

        for (const repository of PersistenceContext.get().repositories) {
            const {target, entity, type} = repository;

            // Check if the current active profiles allow this repository
            // This is useful for conditional repository registration based on environment profiles
            if (allowedProfiles(target)) {
                const entityRepositoryInstance = new (target as any)(entity, entityManager, entityManager.queryRunner);

                logger.info(
                    `Registering a '${type.toString()}' repository '${target.name}' for entity '${entity.name}'`,
                );
                // Set repository to entity manager cache
                (entityManager as any).repositories.set(target, entityRepositoryInstance);
                // set it to the DI container
                iocContainer.set(target, entityRepositoryInstance);
            }
        }
    }
}
