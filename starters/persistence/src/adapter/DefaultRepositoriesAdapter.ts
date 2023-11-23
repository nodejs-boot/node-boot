import {
  ApplicationContext,
  IocContainer,
  RepositoriesAdapter
} from "@node-boot/context";
import { EntityManager } from "typeorm";
import { Logger } from "winston";

export class DefaultRepositoriesAdapter implements RepositoriesAdapter {
  bind(iocContainer: IocContainer): void {
    const entityManager = iocContainer.get(EntityManager);
    const logger = iocContainer.get(Logger);

    for (const repository of ApplicationContext.get().repositories) {
      const { target, entity, type } = repository;

      const entityMetadata = entityManager.connection.getMetadata(entity);

      const entityRepositoryInstance = new (target as any)(
        entity,
        entityManager,
        entityManager.queryRunner
      );

      logger.info(
        `Registering an '${type.toString()}' repository '${
          target.name
        }' for entity '${entity.name}'`
      );
      // Set repository to entity manager cache
      (entityManager as any).repositories.set(target, entityRepositoryInstance);
      // set it to the DI container
      iocContainer.set(target, entityRepositoryInstance);
    }
  }
}
