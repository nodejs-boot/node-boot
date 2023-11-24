import "reflect-metadata";
import { ApplicationContext, RepositoryType } from "@node-boot/context";

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

export const DataRepository = (entity: Function): ClassDecorator => {
    return (target: Function) => {
        const repoType = getRepositoryType(target.prototype);
        if (!repoType) {
            throw new Error(
                `Invalid repository type for repository ${target.prototype.name}. Please extend from Repository, MongoRepository or TreeRepository`
            );
        }

        Reflect.defineMetadata("custom:repotype", repoType, target.prototype);

        ApplicationContext.get().repositories.push({
            target,
            entity,
            type: repoType
        });
    };
};
