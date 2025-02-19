import {Hook} from "./Hook";
import {ApplicationContext} from "@nodeboot/context";

export class RepositoryHook extends Hook {
    use<T>(repositoryClass: new (...args: any[]) => T): T {
        if (!Reflect.hasMetadata("__isRepository", repositoryClass)) {
            throw new Error(`The class ${repositoryClass.name} is not decorated with @SDataRepository.`);
        }
        const iocContainer = ApplicationContext.getIocContainer();
        if (iocContainer) {
            return iocContainer.get(repositoryClass);
        }
        throw new Error(`IOC Container is required for useRepository hook to work`);
    }
}
